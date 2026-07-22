import pg from 'pg';
const { Client } = pg;

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    const { table, type, args, filters, order } = JSON.parse(event.body);
    const connectionString = process.env.NEON_DATABASE_URL;

    if (!connectionString) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing NEON_DATABASE_URL' }) };
    }

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        let queryText = '';
        let queryParams = [];

        if (type === 'select') {
            queryText = `SELECT ${args?.columns || '*'} FROM "${table}"`;

            // Build WHERE clause
            const whereClauses = [];
            filters?.forEach(f => {
                if (f.operator === 'eq') {
                    queryParams.push(f.val);
                    whereClauses.push(`"${f.col}" = $${queryParams.length}`);
                } else if (f.operator === 'gte') {
                    queryParams.push(f.val);
                    whereClauses.push(`"${f.col}" >= $${queryParams.length}`);
                } else if (f.operator === 'lte') {
                    queryParams.push(f.val);
                    whereClauses.push(`"${f.col}" <= $${queryParams.length}`);
                } else if (f.operator === 'or') {
                    // Primitive OR support
                    whereClauses.push(`(${f.queryStr})`);
                }
            });

            if (whereClauses.length > 0) {
                queryText += ` WHERE ${whereClauses.join(' AND ')}`;
            }

            if (order) {
                queryText += ` ORDER BY "${order.col}" ${order.ascending ? 'ASC' : 'DESC'}`;
            }
        } else if (type === 'insert' || type === 'upsert') {
            const keys = Object.keys(args.data);
            const values = Object.values(args.data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            queryParams = values;

            if (type === 'insert') {
                queryText = `INSERT INTO "${table}" ("${keys.join('", "')}") VALUES (${placeholders}) RETURNING *`;
            } else {
                // Simplified upsert - assumes 'id' is the primary key
                const updates = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
                queryText = `INSERT INTO "${table}" ("${keys.join('", "')}") VALUES (${placeholders}) 
                             ON CONFLICT (id) DO UPDATE SET ${updates} RETURNING *`;
            }
        } else if (type === 'update') {
            const keys = Object.keys(args.data);
            const values = Object.values(args.data);
            queryParams = [...values];
            const updates = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');

            // For updates we expect filters to provide the WHERE clause
            const whereClauses = [];
            filters?.forEach(f => {
                if (f.operator === 'eq') {
                    queryParams.push(f.val);
                    whereClauses.push(`"${f.col}" = $${queryParams.length}`);
                }
            });

            queryText = `UPDATE "${table}" SET ${updates}`;
            if (whereClauses.length > 0) queryText += ` WHERE ${whereClauses.join(' AND ')}`;
            queryText += ` RETURNING *`;
        } else if (type === 'delete') {
            queryText = `DELETE FROM "${table}"`;
            const whereClauses = [];
            filters?.forEach(f => {
                if (f.operator === 'eq') {
                    queryParams.push(f.val);
                    whereClauses.push(`"${f.col}" = $${queryParams.length}`);
                }
            });
            if (whereClauses.length > 0) queryText += ` WHERE ${whereClauses.join(' AND ')}`;
            queryText += ` RETURNING *`;
        }

        const result = await client.query(queryText, queryParams);
        await client.end();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ data: result.rows, error: null })
        };
    } catch (error) {
        console.error('Proxy DB error:', error, queryText);
        try { await client.end(); } catch (e) { }
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message, data: null })
        };
    }
};
