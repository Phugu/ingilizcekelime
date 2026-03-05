// Netlify Function: GIF arama proxy
// Tarayıcı bu fonksiyonu çağırır, fonksiyon ise Giphy/Tenor'a ulaşır (sunucu tarafından)

const https = require('https');

exports.handler = async (event) => {
    const { query = '', source = 'giphy', limit = 20 } = event.queryStringParameters || {};

    let apiUrl;

    if (source === 'giphy') {
        const apiKey = Buffer.from('THlmS0EwUTVTaDQyNTg2dlpybmdCTjUzYnI3Z2MxSEw=', 'base64').toString('utf-8');
        const endpoint = query ? 'search' : 'trending';
        apiUrl = `https://api.giphy.com/v1/gifs/${endpoint}?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`;
    } else {
        const apiKey = 'LIVDSRZULELA';
        const endpoint = query ? 'search' : 'featured';
        apiUrl = `https://tenor.googleapis.com/v2/${endpoint}?key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&contentfilter=medium`;
    }

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data)
        };
    } catch (err) {
        console.error('GIF proxy error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'GIF proxy failed', message: err.message })
        };
    }
};
