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

        // Create detailed email body
        // Create readable string for Sheet
        const itemsString = orderItems.map(item =>
            `${item.product.name} x${item.quantity}`
        ).join(', ');

        // Append to Sheet
        sheet.appendRow([
            orderId,
            new Date(),
            ordererId,
            itemsString, // Readable string instead of JSON
            totalAmount,
            'Pending'
        ]);

        // Send Email
        const emailSubject = `[発注通知] 新しい注文が入りました (${orderId})`;
        let emailBody = `以下の注文を受け付けました。\n\n注文ID: ${orderId}\n発注者: ${ordererId}\n合計金額: ¥${totalAmount.toLocaleString()}\n\n注文内容:\n`;

        orderItems.forEach(item => {
            emailBody += `- ${item.product.name} x ${item.quantity}${item.product.unit} (¥${(item.product.price * item.quantity).toLocaleString()})\n`;
        });

        // Send to the admin email (Hardcoded to avoid getActiveUser issues)
        const recipient = 'sakumatakuya.goko@gmail.com';
        MailApp.sendEmail(recipient, emailSubject, emailBody);

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: 'Order placed successfully',
            orderId: orderId
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}
