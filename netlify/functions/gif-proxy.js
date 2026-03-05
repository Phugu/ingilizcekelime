// Netlify Function: GIF arama proxy
// Tarayıcı bu fonksiyonu çağırır, fonksiyon ise Giphy/Tenor'a ulaşır (sunucu tarafından)
// Dönen medya URL'leri de kendi gif-img proxy fonksiyonumuzdan geçiriliyor

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

        // GIF thumbnail ve full URL'lerini kendi proxy'mizden geçir
        // Bu sayede tarayıcı hiçbir zaman engellenmiş media.giphy.com'a bağlanmaz
        const proxyImgUrl = (originalUrl) => {
            if (!originalUrl) return originalUrl;
            return `/.netlify/functions/gif-img?url=${encodeURIComponent(originalUrl)}`;
        };

        // Giphy yanıtı dönüştür
        if (source === 'giphy' && data.data) {
            data.data = data.data.map(gif => {
                if (gif.images) {
                    if (gif.images.fixed_height_small) gif.images.fixed_height_small.url = proxyImgUrl(gif.images.fixed_height_small.url);
                    if (gif.images.fixed_height) gif.images.fixed_height.url = proxyImgUrl(gif.images.fixed_height.url);
                }
                return gif;
            });
        }

        // Tenor yanıtı dönüştür
        if (source === 'tenor' && data.results) {
            data.results = data.results.map(gif => {
                if (gif.media_formats) {
                    if (gif.media_formats.tinygif) gif.media_formats.tinygif.url = proxyImgUrl(gif.media_formats.tinygif.url);
                    if (gif.media_formats.gif) gif.media_formats.gif.url = proxyImgUrl(gif.media_formats.gif.url);
                    if (gif.media_formats.mediumgif) gif.media_formats.mediumgif.url = proxyImgUrl(gif.media_formats.mediumgif.url);
                }
                return gif;
            });
        }

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
