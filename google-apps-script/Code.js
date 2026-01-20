/*
 * Google Apps Script for Supply Order App
 * 
 * Setup Instructions:
 * 1. Create a Google Sheet with two tabs: "Products" and "Orders"
 * 2. "Products" columns: id, name, category, price, unit, stockStatus, image
 * 3. "Orders" columns: orderId, timestamp, orderer, items_json, totalAmount, status
 * 4. Tools > Script editor, copy this code
 * 5. Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 */

function doGet(e) {
    const type = e.parameter.type || 'products';

    if (type === 'employees') {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('EmpList');
        // Assuming validation is done or sheet exists
        const data = sheet.getDataRange().getValues();
        if (data.length === 0) return createJSONOutput([]);

        const headers = data[0];
        const employees = [];

        // Map specific Japanese columns to standardized keys if needed, or just pass through
        // Here we'll pass through everything and let frontend handle mapping, 
        // OR we can map here if we want to be strict.
        // Let's pass through as objects keyed by header names.

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const emp = {};
            for (let j = 0; j < headers.length; j++) {
                emp[headers[j]] = row[j];
            }
            employees.push(emp);
        }
        return createJSONOutput(employees);
    }

    // Default: Products
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const products = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const product = {};
        for (let j = 0; j < headers.length; j++) {
            product[headers[j]] = row[j];
        }
        products.push(product);
    }

    return createJSONOutput(products);
}

function createJSONOutput(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    try {
        const body = JSON.parse(e.postData.contents);
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
        const recipient = 'sakumatakuya.goko@gmail.com'; // Admin/Target email

        // Handle multi-supplier order (with PDFs)
        if (body.type === 'multi_supplier_order' && body.orders && Array.isArray(body.orders)) {
            const results = [];
            const timestamp = new Date();

            body.orders.forEach(order => {
                // order structure: { supplier, items, pdfBase64, fileName }
                const itemsString = order.items.map(item =>
                    `${item.product.name} x${item.quantity}`
                ).join(', ');

                const subTotal = order.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

                // Generate a unique ID for the sheet row or use one if passed.
                // We'll generate one based on time + supplier to ensure uniqueness in log.
                const sheetOrderId = 'ORD-' + timestamp.getTime() + '-' + order.supplier.substring(0, 2); // Simple suffix

                // Append to Sheet
                sheet.appendRow([
                    sheetOrderId,
                    timestamp,
                    body.ordererId + ' (' + order.supplier + ')', // Log who ordered and for which supplier
                    itemsString,
                    subTotal,
                    'Pending'
                ]);

                // Send Email with PDF Attachment
                try {
                    const blob = Utilities.newBlob(Utilities.base64Decode(order.pdfBase64), 'application/pdf', order.fileName);
                    const subject = `[発注書] ${order.supplier} 御中 (発注者: ${body.ordererId})`;
                    const bodyText = `${order.supplier} 御中\n\nいつも大変お世話になっております。\n株式会社五光の${body.ordererId}です。\n\n添付の通り注文書を送付いたします。\nご確認のほど、何卒よろしくお願い申し上げます。\n\n--------------------------------------------------\n注文ID: ${sheetOrderId}\n発注日: ${timestamp.toLocaleDateString('ja-JP')}\n--------------------------------------------------`;

                    MailApp.sendEmail({
                        to: recipient, // In production, this might map to supplier's email
                        subject: subject,
                        body: bodyText,
                        attachments: [blob]
                    });
                } catch (emailError) {
                    console.error('Email sending failed for ' + order.supplier + ': ' + emailError);
                    // Decide whether to fail the whole request or continue. 
                    // For now, log and continue.
                }

                results.push(sheetOrderId);
            });

            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                message: 'Orders processed successfully',
                orderIds: results
            })).setMimeType(ContentService.MimeType.JSON);

        } else {
            // Legacy / Standard single order handling
            const items = body.items || [];
            const orderId = 'ORD-' + Date.now();
            const ordererId = body.ordererId || 'Unknown';
            const totalAmount = body.totalAmount || 0;

            const itemsString = items.map(item =>
                `${item.product.name} x${item.quantity}`
            ).join(', ');

            sheet.appendRow([
                orderId,
                new Date(),
                ordererId,
                itemsString,
                totalAmount,
                'Pending'
            ]);

            // Simple notification email (no attachment)
            const subject = `[発注通知] 新しい注文が入りました (${orderId})`;
            const bodyText = `注文ID: ${orderId}\n発注者: ${ordererId}\n合計金額: ¥${totalAmount.toLocaleString()}\n\n注文内容:\n${itemsString}`;

            MailApp.sendEmail(recipient, subject, bodyText);

            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                message: 'Order placed successfully (Legacy)',
                orderId: orderId
            })).setMimeType(ContentService.MimeType.JSON);
        }

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: 'Error: ' + error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}
