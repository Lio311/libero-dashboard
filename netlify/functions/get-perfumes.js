import pg from 'pg';
const { Client } = pg;

export const handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    const { page = '1', limit = '16' } = event.queryStringParameters || {};
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Connection string from environment variable
    const connectionString = process.env.NEON_DATABASE_URL;

    if (!connectionString) {
        console.error('Missing NEON_DATABASE_URL');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Configuration Error', details: 'Database connection string is missing' })
        };
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false, // Often needed for Neon/Heroku/etc if certificates aren't perfect
        },
    });

    try {
        await client.connect();

        // Get total count
        const countResult = await client.query('SELECT COUNT(*) FROM perfumes');
        const totalCount = parseInt(countResult.rows[0].count);

        // Get paginated data
        const result = await client.query(
            'SELECT * FROM perfumes ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limitNum, offset]
        );

        await client.end();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                data: result.rows,
                total: totalCount,
                page: pageNum,
                totalPages: Math.ceil(totalCount / limitNum),
            }),
        };
    } catch (error) {
        console.error('Database error:', error);
        try {
            await client.end();
        } catch (e) { } // ignore

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
        };
    }
};
