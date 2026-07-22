
const https = require('https');

const ck = 'ck_50e2712ebe187cae81f5a2b6353c0a316067eefe';
const cs = 'cs_fe5ad58ff939b47a0856f5a9c3478cefa5c74c04';
const baseUrl = 'velour.co.il';
const auth = Buffer.from(`${ck}:${cs}`).toString('base64');

const after = '2026-03-01T00:00:00Z';
const before = '2026-03-31T23:59:59Z';

function fetchOrders() {
    return new Promise((resolve, reject) => {
        const query = `after=${after}&before=${before}&per_page=100&status=processing,completed`;
        const options = {
            hostname: baseUrl,
            path: `/wp-json/wc/v3/orders?${query}`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`API error: ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

fetchOrders().then(orders => {
    const ayalaOrders = orders.filter(o => 
        o.coupon_lines.some(cl => cl.code.toLowerCase() === 'ayala10')
    );
    
    console.log(`Found ${ayalaOrders.length} orders for AYALA10 in March`);
    
    ayalaOrders.forEach(o => {
        const lineItemsTotal = o.line_items.reduce((acc, li) => acc + parseFloat(li.total), 0);
        console.log(`Order #${o.id}:`);
        console.log(`  Total (Customer Paid): ${o.total}`);
        console.log(`  Line Items Total (Net): ${lineItemsTotal}`);
        console.log(`  Shipping: ${o.shipping_total}`);
        console.log(`  Tax: ${o.total_tax}`);
        console.log(`  Discount: ${o.discount_total}`);
    });
}).catch(console.error);
