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

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const apiKey = process.env.VITE_GEMINI_API_KEY; 
    if (!apiKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing Gemini API Key in Netlify Dashboard' }) };
    }

    try {
        const payload = JSON.parse(event.body);
        
        return new Promise((resolve) => {
            const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers,
                        body: data
                    });
                });
            });

            req.on('error', (e) => {
                resolve({
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Gemini API connection error', details: e.message })
                });
            });

            req.write(JSON.stringify(payload));
            req.end();
        });

    } catch (error) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid request payload', details: error.message })
        };
    }
};
