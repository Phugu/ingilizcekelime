// Netlify Function: GIF medya (resim) proxy
// Tarayıcı bu fonksiyonu çağırır, fonksiyon ise media.giphy.com veya c.tenor.com'dan resmi indirir

exports.handler = async (event) => {
    const { url } = event.queryStringParameters || {};

    if (!url) {
        return { statusCode: 400, body: 'url parametresi gerekli' };
    }

    // Sadece güvenilir kaynaklara izin ver
    const allowedHosts = [
        'media.giphy.com', 'media0.giphy.com', 'media1.giphy.com',
        'media2.giphy.com', 'media3.giphy.com', 'media4.giphy.com',
        'c.tenor.com', 'tenor.com'
    ];

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        return { statusCode: 400, body: 'Geçersiz URL' };
    }

    const isAllowed = allowedHosts.some(h => parsedUrl.hostname === h);
    if (!isAllowed) {
        return { statusCode: 403, body: 'Bu kaynağa erişim izni yok' };
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return { statusCode: response.status, body: 'Kaynak yüklenemedi' };
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/gif';

        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*'
            },
            body: Buffer.from(buffer).toString('base64'),
            isBase64Encoded: true
        };
    } catch (err) {
        console.error('GIF img proxy error:', err);
        return { statusCode: 500, body: 'Proxy hatası: ' + err.message };
    }
};
