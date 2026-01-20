import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica', // Default font, can setup Japanese font later if needed
    },
    header: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#000000',
        paddingBottom: 5,
        fontWeight: 'bold',
    },
    infoSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        fontSize: 10,
    },
    infoCol: {
        flexDirection: 'column',
    },
    infoText: {
        marginBottom: 4,
    },
    vendorName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 10,
    },
    table: {
        display: 'table',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginBottom: 20,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableColProduct: {
        width: '40%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableColOrderer: {
        width: '20%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableColFactory: {
        width: '15%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableColQty: {
        width: '15%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableColUrgent: {
        width: '10%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableCellHeader: {
        margin: 5,
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    tableCell: {
        margin: 5,
        fontSize: 10,
    },
    tableCellCenter: {
        margin: 5,
        fontSize: 10,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#CCCCCC',
        paddingTop: 10,
    },
    qrSection: {
        alignItems: 'center',
    },
    note: {
        fontSize: 8,
        color: '#666666',
    },
    qrCode: {
        width: 60,
        height: 60,
        marginBottom: 5,
    }
});

// Since standard fonts don't support Japanese, we might see empty boxes.
// For now, we use standard font. If boxes appear, we need to register a font.
// Assuming for prototype we check layout.
// *CRITICAL*: Japanese text will NOT render with default Helvetica.
// We should try to use a registered font or user provided one.
// Register a Japanese font. 
// Using a reliable TTF source. Noto Sans JP from Google Fonts is often WOFF2 which react-pdf doesn't support.
// We'll use a standard TTF link.
Font.register({
    family: 'NotoSansJP',
    src: 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf'
});

const stylesJP = StyleSheet.create({
    font: {
        fontFamily: 'NotoSansJP'
    }
});

const OrderPDF = ({ orderId, date, vendorName, items, qrCodeDataUrl, employee }) => (
    <Document>
        <Page size="A4" style={[styles.page, stylesJP.font]}>
            <Text style={styles.header}>注文書</Text>

            <View style={styles.infoSection}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoText}>発注日: {date}</Text>
                    <Text style={styles.infoText}>注文ID: {orderId}</Text>
                    <Text style={styles.vendorName}>{vendorName}</Text>
                </View>
                <View style={[styles.infoCol, { alignItems: 'flex-end' }]}>
                    {/* Logic implies we might put company logo/name here */}
                    <Text style={styles.infoText}>株式会社 五光</Text>
                    <Text style={{ fontSize: 8, marginTop: 4 }}>茨城工場 電話 0296-48-3020 fax 0296-48-3022</Text>
                    <Text style={{ fontSize: 8 }}>古河工場 電話 0280-98-6222 fax 0280-98-6231</Text>

                    {/* QR Code moved to header for consistent scanning position */}
                    {qrCodeDataUrl && (
                        <Image src={qrCodeDataUrl} style={{ width: 60, height: 60, marginTop: 10 }} />
                    )}
                </View>
            </View>

            <View style={styles.table}>
                <View style={styles.tableRow}>
                    <View style={styles.tableColProduct}>
                        <Text style={styles.tableCellHeader}>品名・詳細</Text>
                    </View>
                    <View style={styles.tableColOrderer}>
                        <Text style={styles.tableCellHeader}>発注者</Text>
                    </View>
                    <View style={styles.tableColFactory}>
                        <Text style={styles.tableCellHeader}>納入工場</Text>
                    </View>
                    <View style={styles.tableColQty}>
                        <Text style={styles.tableCellHeader}>数量</Text>
                    </View>
                    <View style={styles.tableColUrgent}>
                        <Text style={styles.tableCellHeader}>至急</Text>
                    </View>
                </View>

                {items.map((item, index) => (
                    <View style={styles.tableRow} key={index}>
                        <View style={styles.tableColProduct}>
                            <Text style={styles.tableCell}>{item.product.name}</Text>
                        </View>
                        <View style={styles.tableColOrderer}>
                            <Text style={styles.tableCellCenter}>{employee.codeName || `${employee.id} ${employee.name}`}</Text>
                        </View>
                        <View style={styles.tableColFactory}>
                            <Text style={styles.tableCellCenter}>{employee.factory}</Text>
                        </View>
                        <View style={styles.tableColQty}>
                            <Text style={styles.tableCellCenter}>{item.quantity} {item.product.unit}</Text>
                        </View>
                        <View style={styles.tableColUrgent}>
                            <Text style={styles.tableCellCenter}>{item.isUrgent ? '★' : ''}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.qrSection}>
                <Text style={styles.note}>※納品時に右上のQRコード、または注文IDを確認させていただきます。</Text>
            </View>
        </Page>
    </Document>
);

export default OrderPDF;
