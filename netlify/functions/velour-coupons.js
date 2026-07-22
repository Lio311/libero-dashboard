const https = require('https');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const { month } = event.queryStringParameters || {};
    if (!month) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Month parameter is required (YYYY-MM)' }) };
    }

    // Fallback securely since this runs on Node.js server-side, never exposed to client browser
    const ck = process.env.VELOUR_WC_CK || 'ck_50e2712ebe187cae81f5a2b6353c0a316067eefe';
    const cs = process.env.VELOUR_WC_CS || 'cs_fe5ad58ff939b47a0856f5a9c3478cefa5c74c04';
    const baseUrl = 'velour.co.il';

    if (!ck || !cs) {
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: 'Missing credentials' }) 
        };
    }

    const auth = Buffer.from(`${ck}:${cs}`).toString('base64');
    
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthIdx = parseInt(monthStr) - 1;
    const after = new Date(year, monthIdx, 1).toISOString();
    const before = new Date(year, monthIdx + 1, 0, 23, 59, 59).toISOString();

    const fetchOrders = (page = 1) => {
        return new Promise((resolve, reject) => {
            const query = `after=${after}&before=${before}&per_page=100&page=${page}&status=processing,completed`;
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
                        try {
                            resolve(JSON.parse(body));
                        } catch (e) {
                            reject(new Error(`Failed to parse WooCommerce response`));
                        }
                    } else {
                        reject(new Error(`WooCommerce API error: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.end();
        });
    };

    try {
        let allOrders = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const orders = await fetchOrders(page);
            allOrders = allOrders.concat(orders);
            
            if (orders.length < 100) {
                hasMore = false;
            } else {
                page++;
            }
            if (page > 10) break; 
        }

        const couponStats = {};
        allOrders.forEach(order => {
            if (order.coupon_lines && order.coupon_lines.length > 0) {
                order.coupon_lines.forEach(cl => {
                    const code = cl.code.toLowerCase();
                    if (!couponStats[code]) {
                        couponStats[code] = { code: cl.code, count: 0, total_sales: 0 };
                    }
                    couponStats[code].count += 1;
                    const netSales = order.line_items.reduce((acc, li) => acc + parseFloat(li.total || 0), 0);
                    couponStats[code].total_sales += netSales;
                });
            }
        });

        const data = Object.values(couponStats).sort((a, b) => b.total_sales - a.total_sales);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ data, error: null })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message, data: null })
        };
    }
};
