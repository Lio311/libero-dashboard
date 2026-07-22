import pg from 'pg';
const { Client } = pg;

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { page = '1', limit = '16' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const connectionString = process.env.NEON_DATABASE_URL;

    if (!connectionString) {
        console.error('Missing NEON_DATABASE_URL');
        return res.status(500).json({ error: 'Configuration Error', details: 'Database connection string is missing' });
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        await client.connect();

        const countResult = await client.query('SELECT COUNT(*) FROM perfumes');
        const totalCount = parseInt(countResult.rows[0].count);

        const result = await client.query(
            'SELECT * FROM perfumes ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limitNum, offset]
        );

        await client.end();

        return res.status(200).json({
            data: result.rows,
            total: totalCount,
            page: pageNum,
            totalPages: Math.ceil(totalCount / limitNum),
        });
    } catch (error) {
        console.error('Database error:', error);
        try {
            await client.end();
        } catch (e) { }

        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
