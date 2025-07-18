const express = require('express');
const app = express();
const port = 3000; // Coolify bu portu otomatik olarak yönetir

// Tarayıcıdan gelen JSON verilerini okuyabilmek için
app.use(express.json());

// 'public' klasöründeki statik dosyaları (index.html gibi) sunmak için
app.use(express.static('public'));

// Google Gemini API'ye istek gönderecek ana fonksiyon
async function callGeminiAPI(prompt) {
    // API anahtarını Coolify'ın güvenli ortam değişkenlerinden alıyoruz
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error("HATA: GEMINI_API_KEY ortam değişkeni ayarlanmamış!");
        throw new Error("API anahtarı sunucuda ayarlanmamış.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Google API Hatası:", errorData);
            throw new Error(`API çağrısı başarısız: ${response.status}`);
        }

        const result = await response.json();
        
        // API'den gelen cevabın beklenen yapıda olduğunu kontrol et
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.error("Beklenmedik API yanıt yapısı:", result);
            throw new Error("API'den geçerli bir metin yanıtı alınamadı.");
        }

    } catch (error) {
        console.error("Gemini API'ye bağlanırken hata oluştu:", error);
        throw error;
    }
}

// Tarayıcıdan gelen istekleri karşılayacak olan API endpoint'imiz
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'İstek için bir prompt metni gereklidir.' });
        }
        
        const responseText = await callGeminiAPI(prompt);
        res.json({ text: responseText });

    } catch (error) {
        // Hata mesajını daha anlaşılır hale getirelim
        res.status(500).json({ error: 'Yapay zeka modeline bağlanırken bir sunucu hatası oluştu.' });
    }
});


app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});