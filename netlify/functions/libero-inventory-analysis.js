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

    const ck = process.env.LIBERO_WC_CK;
    const cs = process.env.LIBERO_WC_CS;
    const baseUrl = 'libero-il.co.il';

    if (!ck || !cs) {
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: 'חסרים מפתחות גישה ל-WooCommerce (LIBERO_WC_CK/CS)' }) 
        };
    }

    const auth = Buffer.from(`${ck}:${cs}`).toString('base64');

    const apiFetch = (endpoint, query = '') => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: baseUrl,
                path: `/wp-json/wc/v3/${endpoint}?${query}`,
                method: 'GET',
                timeout: 15000, 
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Netlify-Function'
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
                            reject(new Error(`Failed to parse response for ${endpoint}: ${body.substring(0, 100)}`));
                        }
                    } else {
                        reject(new Error(`WooCommerce API error ${res.statusCode} for ${endpoint}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`API Timeout for ${endpoint}`));
            });
            req.end();
        });
    };

    try {
        console.log('Starting Smart Inventory Analysis...');
        
        // Batch helper: runs promises in groups to avoid overwhelming WooCommerce
        const batchRun = async (promiseFactories, batchSize = 5) => {
            const results = [];
            for (let i = 0; i < promiseFactories.length; i += batchSize) {
                const batch = promiseFactories.slice(i, i + batchSize).map(fn => fn());
                const settled = await Promise.allSettled(batch);
                results.push(...settled);
            }
            return results;
        };

        // 1. Fetch first page to see how many total products/pages there are
        const firstPageResponse = await apiFetch('products', 'per_page=100&status=any&_fields=id,name,sku,price,stock_quantity,date_created,categories,status&page=1');
        
        // If we can't get any products, we can't proceed
        if (!Array.isArray(firstPageResponse) || firstPageResponse.length === 0) {
            throw new Error('לא נמצאו מוצרים באתר');
        }

        // We'll estimate pages. Since we can't see headers easily in the current apiFetch, 
        // we'll fetch in batches until we hit an empty page or a reasonable limit (e.g. 80 pages).
        let allProducts = [...firstPageResponse];
        const maxPages = 80; 
        
        console.log('Fetching subsequent pages...');
        for (let i = 2; i <= maxPages; i += 10) {
            const batch = Array.from({length: Math.min(10, maxPages - i + 1)}, (_, idx) => {
                const pageNum = i + idx;
                return apiFetch('products', `per_page=100&status=any&_fields=id,name,sku,price,stock_quantity,date_created,categories,status&page=${pageNum}`)
                    .catch(() => []);
            });
            
            const results = await Promise.all(batch);
            const batchProducts = results
                .filter(r => Array.isArray(r))
                .flat()
                .filter(p => p && p.id);
            allProducts.push(...batchProducts);
            
            // If this batch added no new products, we've reached the end
            if (batchProducts.length === 0) break;
            
            // If the last successful page had fewer than 100, we've likely reached the end
            const lastNonEmpty = [...results].reverse().find(r => Array.isArray(r) && r.length > 0);
            if (lastNonEmpty && lastNonEmpty.length < 100) break;
        }

        console.log(`Total products fetched: ${allProducts.length}`);

        // 2. Fetch comax category mappings ONLY for the pages we actually have
        const mappingPagesNeeded = Math.ceil(allProducts.length / 100) + 1;
        const comCatPageFactories = Array.from({length: mappingPagesNeeded}, (_, i) => 
            () => new Promise((resolve) => {
                const options = {
                    hostname: baseUrl,
                    path: `/wp-json/wp/v2/product?per_page=100&_fields=id,com_cat&page=${i+1}`,
                    method: 'GET',
                    timeout: 10000,
                    headers: { 'Authorization': `Basic ${auth}`, 'User-Agent': 'Netlify-Function' }
                };
                const req = https.get(options, res => {
                    let d=''; res.on('data', c=>d+=c); res.on('end', ()=> { try{resolve(JSON.parse(d))}catch(e){resolve([])} })
                });
                req.on('error', ()=>resolve([]));
                req.on('timeout', ()=>{req.destroy(); resolve([])});
            })
        );
        const comCatPagesResults = await batchRun(comCatPageFactories, 10);
        const allComCatMappings = comCatPagesResults
            .map(r => r.status === 'fulfilled' ? r.value : [])
            .flat()
            .filter(p => p && p.id);

        // Fetch comax terms (small, one request)
        const comCatTerms = await new Promise((resolve) => {
            const options = {
                hostname: baseUrl,
                path: '/wp-json/wp/v2/com_cat?per_page=100',
                method: 'GET',
                headers: { 'Authorization': `Basic ${auth}`, 'User-Agent': 'Netlify-Function' }
            };
            https.get(options, res => {
                let d=''; res.on('data', c=>d+=c); res.on('end', ()=> { try{resolve(JSON.parse(d))}catch(e){resolve([])} })
            }).on('error', ()=>resolve([]));
        });

        // Build comax mapping
        const termMap = {};
        (Array.isArray(comCatTerms) ? comCatTerms : []).forEach(t => termMap[t.id] = t.name);
        const prodComCatMap = {};
        allComCatMappings.forEach(p => {
            if (p && p.id && p.com_cat && p.com_cat.length > 0) {
                prodComCatMap[p.id] = termMap[p.com_cat[0]] || null;
            }
        });

        // Fetch orders (up to 500) and reports in parallel
        const orderPagePromises = Array.from({length: 5}, (_, i) =>
            apiFetch('orders', `per_page=100&status=processing,completed&_fields=id,total,date_created,line_items,customer_id&page=${i+1}`)
                .catch(() => [])
        );

        const parallelResults = await Promise.all([
            apiFetch('reports/customers/totals').catch(() => []),
            apiFetch('reports/sales', `date_min=${new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`).catch(() => []),
            apiFetch('reports/coupons/totals', 'per_page=10').catch(() => []),
            ...orderPagePromises
        ]);

        const customerTotalsResult = parallelResults[0];
        const salesTrendResult = parallelResults[1];
        const couponReportResult = parallelResults[2];
        const orderPagesResults = parallelResults.slice(3);

        const allOrders = orderPagesResults
            .filter(r => Array.isArray(r))
            .flat()
            .filter(o => o && o.id);
        const customerTotalsVal = Array.isArray(customerTotalsResult) ? customerTotalsResult : [];
        const salesTrendVal = Array.isArray(salesTrendResult) ? salesTrendResult : [];
        const couponReportVal = Array.isArray(couponReportResult) ? couponReportResult : [];

        console.log(`Fetched ${allOrders.length} orders for KPI calculation`);

        // Calculate KPIs directly from actual orders (the correct approach)
        let totalSales = 0;
        let totalOrders = allOrders.length;
        const uniqueCustomers = new Set();

        allOrders.forEach(order => {
            totalSales += parseFloat(order.total || 0);
            if (order.customer_id && order.customer_id > 0) {
                uniqueCustomers.add(order.customer_id);
            }
        });

        // For customer count: use reports API if available, otherwise use unique customers from orders
        let totalCustomers = 0;
        if (customerTotalsVal.length > 0) {
            // reports/customers/totals returns [{slug: "paying", total: X}, {slug: "non_paying", total: Y}]
            customerTotalsVal.forEach(item => {
                if (item.slug === 'paying') {
                    totalCustomers += parseInt(item.total || 0);
                }
            });
        }
        if (totalCustomers === 0) {
            totalCustomers = uniqueCustomers.size;
        }

        const aov = totalOrders > 0 ? totalSales / totalOrders : 0;
        const ltv = totalCustomers > 0 ? totalSales / totalCustomers : 0;
        
        console.log(`KPIs: Sales=₪${Math.round(totalSales)}, Orders=${totalOrders}, Customers=${totalCustomers}, AOV=₪${Math.round(aov)}, LTV=₪${Math.round(ltv)}`);

        // Process Products & Dead Stock using recent orders
        const salesMap = {};
        allOrders.forEach(order => {
            if (Array.isArray(order.line_items)) {
                order.line_items.forEach(item => {
                    if (!salesMap[item.product_id]) {
                        salesMap[item.product_id] = { quantity: 0, total: 0 };
                    }
                    salesMap[item.product_id].quantity += item.quantity || 0;
                    salesMap[item.product_id].total += parseFloat(item.total || 0);
                });
            }
        });

        const now = new Date();
        const analyzedProducts = allProducts.map(p => {
            const sales = salesMap[p.id] || { quantity: 0, total: 0 };
            // Since we are only fetching the last 300 orders, sales history is likely ~30-90 days, so we assume ageDays = 90 max for velocity.
            const calculatedAge = Math.floor((now - new Date(p.date_created)) / (1000 * 60 * 60 * 24)) || 1;
            const velocityAgeDays = Math.min(calculatedAge, 90); 
            
            const salesVelocity = sales.quantity / (velocityAgeDays > 30 ? (velocityAgeDays / 30) : 1);
            const dos = salesVelocity > 0 ? (p.stock_quantity || 0) / (salesVelocity / 30) : (p.stock_quantity > 0 ? 9999 : 0);

            const comaxGroup = prodComCatMap[p.id] || (Array.isArray(p.categories) && p.categories[0] ? p.categories[0].name : 'אחר');

            return {
                id: p.id,
                name: p.name,
                sku: p.sku || '',
                price: parseFloat(p.price) || 0,
                stock: p.stock_quantity || 0,
                date_created: p.date_created,
                age_days: calculatedAge,
                total_sales_qty: Math.round(sales.quantity * (calculatedAge / velocityAgeDays)), // Extrapolate to all-time
                total_revenue: sales.total * (calculatedAge / velocityAgeDays), // Extrapolate to all-time
                sales_velocity: salesVelocity,
                dos: dos,
                status: p.status || 'publish',
                categories: [comaxGroup]
            };
        });

        const deadStock = analyzedProducts
            .filter(p => p.dos > 360 && p.age_days > 90 && p.stock > 0)
            .sort((a, b) => (b.stock * b.price) - (a.stock * a.price));

        // Finalize Sales Trend Fallback
        let finalSalesTrend = Array.isArray(salesTrendVal) ? salesTrendVal : [];
        if (finalSalesTrend.length <= 1 && allOrders.length > 0) {
            console.log('Generating padded sales trend from recent orders...');
            const trendMap = {};
            // Pre-fill last 6 months with 0
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const monthStr = d.toISOString().substring(0, 7); // YYYY-MM
                trendMap[monthStr] = 0;
            }
            // Add actual order totals
            allOrders.forEach(o => {
                const month = o.date_created.substring(0, 7);
                // Only count within our range for cleaner graph
                if (trendMap[month] !== undefined) {
                    trendMap[month] += parseFloat(o.total || 0);
                }
            });
            finalSalesTrend = Object.entries(trendMap)
                .map(([month, total]) => ({ month, total_sales: total }))
                .sort((a, b) => a.month.localeCompare(b.month));
        }

        const couponTypeMap = {
            'percent': 'אחוז הנחה',
            'fixed_cart': 'הנחה קבועה לעגלה',
            'fixed_product': 'הנחה קבועה למוצר',
            'shipping': 'משלוח חינם'
        };

        const ltvBySource = Array.isArray(couponReportVal) ? couponReportVal.map(c => ({
            source: couponTypeMap[c.slug] || c.slug || 'אחר',
            total_sales: parseFloat(c.total || 0),
            orders: c.orders || 0,
            aov: c.orders > 0 ? parseFloat(c.total) / c.orders : 0
        })).sort((a, b) => b.total_sales - a.total_sales) : [];

        // Calculate KPI totals for all products, not just top 50
        const totalItemsInStock = analyzedProducts.reduce((acc, p) => acc + (p.stock || 0), 0);
        const totalProductsVariety = analyzedProducts.length;

        // Calculate Status Breakdown
        const statusBreakdown = {
            publish: 0,
            draft: 0,
            outofstock: 0, // We can infer this if stock <= 0, or if there's a stock_status field. Let's use custom logic.
            other: 0
        };

        analyzedProducts.forEach(p => {
            if (p.stock <= 0) {
                statusBreakdown.outofstock += 1;
            } else if (p.status === 'publish') {
                statusBreakdown.publish += 1;
            } else if (p.status === 'draft') {
                statusBreakdown.draft += 1;
            } else {
                statusBreakdown.other += 1;
            }
        });

        const formattedStatusBreakdown = [
            { name: 'במלאי', value: statusBreakdown.publish },
            { name: 'לא במלאי', value: statusBreakdown.outofstock },
            { name: 'טיוטה', value: statusBreakdown.draft },
        ].filter(s => s.value > 0);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                kpis: {
                    total_revenue: totalSales,
                    total_orders: totalOrders,
                    total_customers: totalCustomers,
                    aov: aov,
                    ltv: ltv,
                    total_items_in_stock: totalItemsInStock,
                    total_products_variety: totalProductsVariety
                },
                status_breakdown: formattedStatusBreakdown,
                sales_trend: finalSalesTrend,
                products: analyzedProducts.sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 50),
                dead_stock: deadStock.slice(0, 30),
                ltv_by_source: ltvBySource,
                debug: {
                    totalProductsFetched: allProducts.length,
                    comaxMappingsFound: Object.keys(prodComCatMap).length,
                    totalOrdersFetched: allOrders.length
                }
            })
        };


    } catch (error) {
        console.error('Final Analysis error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            })
        };
    }
};
