/*
 * Google Apps Script for Supply Order App
 * Last Updated: 2026-01-21 11:55
 * 
 * Update: Added Receiving, History, and Item Management features
 * Schema: Aligned with User's current "Orders" sheet (Item-level rows)
 */

function doGet(e) {
    const type = e.parameter.type || 'products';

    // 1. Get Employees
    if (type === 'employees') {
        return getSheetData('EmpList');
    }

    // 2. Get Order History
    if (type === 'orders') {
        return getSheetData('Orders');
    }

    // Default: Get Products
    return getSheetData('Products');
}

function getSheetData(sheetName) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return createJSONOutput([]);

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJSONOutput([]);

    const headers = data[0];
    const result = [];

    // Simple parser that maps headers to object keys
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const item = {};
        for (let j = 0; j < headers.length; j++) {
            item[headers[j]] = row[j];
        }
        result.push(item);
    }
    return createJSONOutput(result);
}

function createJSONOutput(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    try {
        const body = JSON.parse(e.postData.contents);
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        // --- ACTION: RECEIVE ORDER ---
        if (body.action === 'receive') {
            const sheet = ss.getSheetByName('Orders');
            const data = sheet.getDataRange().getValues();
            const orderId = body.orderId;
            const targetItems = body.targetItems; // Array of ProductNames (optional)
            let found = false;

            // "Orders" Sheet Columns (Based on User Screenshot):
            // A: OrderId (0), E: ProductName (4), I: Status (8), K: ReceivedAt (10)

            for (let i = 1; i < data.length; i++) {
                if (data[i][0] == orderId) { // Match OrderId
                    const currentStatus = data[i][8];
                    // Skip if already received (optional check, but good for partial updates)
                    if (currentStatus === 'Received') continue;

                    // If targetItems is specified, check if this row's product is in the list
                    const productName = data[i][4];
                    if (targetItems && !targetItems.includes(productName)) {
                        continue; // Skip this item as it's not selected
                    }

                    sheet.getRange(i + 1, 9).setValue('Received'); // Col I (Status)
                    sheet.getRange(i + 1, 11).setValue(new Date()); // Col K (ReceivedAt)
                    found = true;
                }
            }

            if (found) {
                return createJSONOutput({ success: true, message: 'Order received.' });
            } else {
                return createJSONOutput({ success: false, message: 'Order not found or no items updated.' });
            }
        }

        // --- ACTION: REGISTER PRODUCT ---
        if (body.action === 'registerProduct') {
            const sheet = ss.getSheetByName('Products');
            const data = sheet.getDataRange().getValues();
            // Simple Numeric ID auto-increment
            // Check max ID in Column A (index 0)
            let maxId = 0;
            if (data.length > 1) {
                for (let i = 1; i < data.length; i++) {
                    let id = parseInt(data[i][0]);
                    if (!isNaN(id) && id > maxId) maxId = id;
                }
            }
            const newId = maxId + 1;

            sheet.appendRow([
                newId,
                body.name,
                body.category,
                body.price,
                body.unit,
                'In Stock', // Default status
                body.image || ''
            ]);

            return createJSONOutput({ success: true, message: 'Product registered.' });
        }

        // --- ACTION: UPDATE PRODUCT ---
        if (body.action === 'updateProduct') {
            const sheet = ss.getSheetByName('Products');
            const historySheet = ss.getSheetByName('ProductHistory');
            // If history sheet doesn't exist, try to insert (or fail gracefully)
            if (!historySheet && body.createHistory) {
                try { ss.insertSheet('ProductHistory'); } catch (e) { }
            }

            const data = sheet.getDataRange().getValues();
            const targetId = body.id;
            let updated = false;

            for (let i = 1; i < data.length; i++) {
                // Check ID match (Column A)
                if (data[i][0] == targetId) {

                    // Log to history first
                    if (historySheet) {
                        historySheet.appendRow([
                            new Date(),
                            'UPDATE',
                            JSON.stringify(data[i]), // Old data dump
                            body.updater || 'Admin'
                        ]);
                    }

                    // Update columns (Assuming Products format: id, name, category, price, unit, stock, image)
                    if (body.name) sheet.getRange(i + 1, 2).setValue(body.name);
                    if (body.category) sheet.getRange(i + 1, 3).setValue(body.category);
                    if (body.price) sheet.getRange(i + 1, 4).setValue(body.price);
                    if (body.unit) sheet.getRange(i + 1, 5).setValue(body.unit);
                    if (body.stockStatus) sheet.getRange(i + 1, 6).setValue(body.stockStatus);
                    if (body.image) sheet.getRange(i + 1, 7).setValue(body.image);

                    updated = true;
                    break;
                }
            }

            if (updated) {
                return createJSONOutput({ success: true, message: 'Product updated.' });
            } else {
                return createJSONOutput({ success: false, message: 'Product not found.' });
            }
        }


        // --- ORIGINAL ORDER LOGIC (Multi-supplier) ---
        if (body.type === 'multi_supplier_order' && body.orders && Array.isArray(body.orders)) {
            const sheet = ss.getSheetByName('Orders');
            const recipient = 'sakumatakuya.goko@gmail.com';
            const results = [];
            const timestamp = new Date();

            // Orderer Info parsing
            const ordererInfo = body.orderer || {};
            const ordererNameLine = ordererInfo.codeName || (body.ordererId || '不明');
            const factory = ordererInfo.factory || '未設定'; // If needed

            body.orders.forEach(order => {
                // Use provided ID if available (matches QR code), else generate one
                const sheetOrderId = order.id || ('ORD-' + timestamp.getTime() + '-' + order.supplier.substring(0, 2));

                // HTML Item List for Email
                const itemsListHtml = order.items.map(item => {
                    const unit = item.product.unit || '個';
                    return `<b>${item.product.name} X ${item.quantity}${unit}<br>&nbsp;&nbsp;納入場所（${factory}）：発注者（${ordererNameLine}）</b>`;
                }).join('<br><br>');

                // Append Rows to Sheet (ONE ROW PER ITEM)
                // Columns: A:OrderId, B:Date, C:Orderer, D:Supplier, E:ProductName, F:Quantity, G:Unit, H:IsUrgent, I:Status, J:ReceivedQty
                order.items.forEach(item => {
                    const unit = item.product.unit || '個';
                    // We don't have explicit "isUrgent" in cart item yet, default to FALSE or pass if enabled later
                    const isUrgent = item.isUrgent || false;

                    sheet.appendRow([
                        sheetOrderId,       // A: OrderId
                        timestamp,          // B: Date
                        ordererNameLine,    // C: Orderer
                        order.supplier,     // D: Supplier
                        item.product.name,  // E: ProductName
                        item.quantity,      // F: Quantity
                        unit,               // G: Unit
                        isUrgent,           // H: IsUrgent
                        'Pending',          // I: Status
                        0                   // J: ReceivedQty
                    ]);
                });

                // Email Logic (Send one email per supplier order)
                try {
                    // Re-use HTML email logic...
                    const blob = Utilities.newBlob(Utilities.base64Decode(order.pdfBase64), 'application/pdf', order.fileName);
                    const subject = `[発注書] ${order.supplier} 御中`;
                    const htmlBody = `
                        ${order.supplier} 御中<br>ご担当者 様<br><br>
                        いつも大変お世話になっております。<br><br>
                        下記、発注させていただきます。<br>
                        添付の注文書（PDF）をご確認の上、よろしくお手配ください。<br><br>
                        ＊【至急】アイテムの納入に時間がかかる場合、すみやかにご連絡お願いします。<br>
                        ＊<b>納入時、注文書PDFを印刷</b>してお持ちいただく（QRコードで納入受付をいたします）<br>
                        <br>
                        <br>
                        <br>
                        記<br>
                        <br>
                        ${itemsListHtml}<br>
                        <br>
                        お問合せ・ご不明点は、納入工場の下記窓口までお問合せください。<br>
                        <br>
                        以上<br>
                        <br>
                        お問合せ窓口<br>
                        ****************************************************<br>
                        株式会社　五光　古河工場　担当：知久<br>
                        〒306-0202　茨城県古河市稲宮1034<br>
                        Tel　0280-98-6222<br>
                        Fax　0280-98-6231<br>
                        e-mail: chiku.goko@gmail.com<br>
                        ****************************************************<br>
                        株式会社　五光　茨城工場　担当：中山<br>
                        〒300-3561　茨城県結城郡八千代町平塚4600<br>
                        Tel　0296-48-3021<br>
                        Fax　0296-48-3022<br>
                        e-mail: nakayamatomoko.goko@gmail.com<br>
                        ****************************************************
                    `;

                    MailApp.sendEmail({
                        to: recipient,
                        subject: subject,
                        htmlBody: htmlBody,
                        attachments: [blob]
                    });
                } catch (emailError) {
                    console.error('Email sending failed for ' + order.supplier + ': ' + emailError);
                }

                results.push(sheetOrderId);
            });

            return createJSONOutput({
                success: true,
                message: 'Orders processed successfully',
                orderIds: results
            });
        }

        else {
            return createJSONOutput({ success: false, message: 'Legacy format not supported.' });
        }

    } catch (error) {
        return createJSONOutput({
            success: false,
            message: 'Error: ' + error.toString()
        });
    }
}
