// Kelime Öğrenme Modülü
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore();

export class WordLearning {
    constructor(containerId, userId) {
        this.containerId = containerId;
        this.userId = userId;
        this.words = [];
        this.currentWordIndex = 0;
        this.currentPool = null;
        this.showingTranslation = false;
        this.testWords = [];
        this.usedTestWords = [];
        this.correctAnswers = 0;
        this.testIndex = 0; // Hangi testin gösterildiğini takip etmek için
    }

    // A1 seviye kelime havuzları (İngilizce-Türkçe)
    get a1WordPools() {
        return {
            learning1: [
                { english: "Hello", turkish: "Merhaba", level: "A1", category: "Learning1", example: "Hello, how are you today?", exampleTurkish: "Merhaba, bugün nasılsın?" },
                { english: "Thank you", turkish: "Teşekkür ederim", level: "A1", category: "Learning1", example: "Thank you for your help.", exampleTurkish: "Yardımın için teşekkür ederim." },
                { english: "Water", turkish: "Su", level: "A1", category: "Learning1", example: "Can I have some water, please?", exampleTurkish: "Biraz su alabilir miyim, lütfen?" },
                { english: "Food", turkish: "Yemek", level: "A1", category: "Learning1", example: "The food in this restaurant is delicious.", exampleTurkish: "Bu restoranda yemek lezzetli." },
                { english: "Friend", turkish: "Arkadaş", level: "A1", category: "Learning1", example: "She is my best friend.", exampleTurkish: "O benim en iyi arkadaşım." },
                { english: "Airport", turkish: "Havalimanı", level: "A1", category: "Learning1", example: "We arrived at the airport two hours early.", exampleTurkish: "Havalimanına iki saat erken vardık." },
                { english: "Ticket", turkish: "Bilet", level: "A1", category: "Learning1", example: "I bought a ticket for the concert.", exampleTurkish: "Konser için bir bilet aldım." },
                { english: "Hotel", turkish: "Otel", level: "A1", category: "Learning1", example: "We stayed at a nice hotel by the beach.", exampleTurkish: "Plaj kenarında güzel bir otelde kaldık." },
                { english: "Passport", turkish: "Pasaport", level: "A1", category: "Learning1", example: "Don't forget to bring your passport.", exampleTurkish: "Pasaportunuzu getirmeyi unutmayın." },
                { english: "Taxi", turkish: "Taksi", level: "A1", category: "Learning1", example: "We took a taxi from the airport to the hotel.", exampleTurkish: "Havalimanından otele taksiyle gittik." }
            ],
            learning2: [
                { english: "Bread", turkish: "Ekmek", level: "A1", category: "Learning2", example: "I like fresh bread for breakfast.", exampleTurkish: "Kahvaltıda taze ekmek severim." },
                { english: "Milk", turkish: "Süt", level: "A1", category: "Learning2", example: "Do you want some milk in your coffee?", exampleTurkish: "Kahvenizde biraz süt ister misiniz?" },
                { english: "Apple", turkish: "Elma", level: "A1", category: "Learning2", example: "I eat an apple every day.", exampleTurkish: "Her gün bir elma yerim." },
                { english: "Meat", turkish: "Et", level: "A1", category: "Learning2", example: "They don't eat meat; they're vegetarians.", exampleTurkish: "Et yemezler; onlar vejetaryendir." },
                { english: "Vegetable", turkish: "Sebze", level: "A1", category: "Learning2", example: "It's important to eat vegetables every day.", exampleTurkish: "Her gün sebze yemek önemlidir." },
                { english: "Mother", turkish: "Anne", level: "A1", category: "Learning2", example: "My mother is a doctor.", exampleTurkish: "Annem bir doktordur." },
                { english: "Father", turkish: "Baba", level: "A1", category: "Learning2", example: "His father works in a bank.", exampleTurkish: "Babası bir bankada çalışıyor." },
                { english: "Sister", turkish: "Kız kardeş", level: "A1", category: "Learning2", example: "I have one sister and two brothers.", exampleTurkish: "Bir kız kardeşim ve iki erkek kardeşim var." },
                { english: "Brother", turkish: "Erkek kardeş", level: "A1", category: "Learning2", example: "My brother is three years older than me.", exampleTurkish: "Erkek kardeşim benden üç yaş büyük." },
                { english: "Child", turkish: "Çocuk", level: "A1", category: "Learning2", example: "The children are playing in the park.", exampleTurkish: "Çocuklar parkta oynuyor." }
            ],
            learning3: [
                { english: "Book", turkish: "Kitap", level: "A1", category: "Learning3", example: "I'm reading an interesting book.", exampleTurkish: "İlginç bir kitap okuyorum." },
                { english: "Pen", turkish: "Kalem", level: "A1", category: "Learning3", example: "Can I borrow your pen, please?", exampleTurkish: "Kaleminizi ödünç alabilir miyim, lütfen?" },
                { english: "Teacher", turkish: "Öğretmen", level: "A1", category: "Learning3", example: "Our teacher is very patient with us.", exampleTurkish: "Öğretmenimiz bize karşı çok sabırlı." },
                { english: "Student", turkish: "Öğrenci", level: "A1", category: "Learning3", example: "She is a hardworking student.", exampleTurkish: "O çalışkan bir öğrenci." },
                { english: "School", turkish: "Okul", level: "A1", category: "Learning3", example: "The school is closed for the holidays.", exampleTurkish: "Okul tatil için kapalı." },
                { english: "House", turkish: "Ev", level: "A1", category: "Learning3", example: "They live in a big house with a garden.", exampleTurkish: "Bahçeli büyük bir evde yaşıyorlar." },
                { english: "Car", turkish: "Araba", level: "A1", category: "Learning3", example: "My car is parked outside.", exampleTurkish: "Arabam dışarıda park halinde." },
                { english: "Bus", turkish: "Otobüs", level: "A1", category: "Learning3", example: "I take the bus to work every day.", exampleTurkish: "Her gün işe otobüsle giderim." },
                { english: "Train", turkish: "Tren", level: "A1", category: "Learning3", example: "The train leaves at 9:30.", exampleTurkish: "Tren 9:30'da kalkıyor." },
                { english: "Bicycle", turkish: "Bisiklet", level: "A1", category: "Learning3", example: "I ride my bicycle to school when the weather is nice.", exampleTurkish: "Hava güzel olduğunda okula bisikletle giderim." }
            ],
            general: [
                { english: "Hello", turkish: "Merhaba", level: "A1", category: "General", example: "Hello, how are you today?", exampleTurkish: "Merhaba, bugün nasılsın?" },
                { english: "Thank you", turkish: "Teşekkür ederim", level: "A1", category: "General", example: "Thank you for your help.", exampleTurkish: "Yardımın için teşekkür ederim." },
                { english: "Water", turkish: "Su", level: "A1", category: "General", example: "Can I have some water, please?", exampleTurkish: "Biraz su alabilir miyim, lütfen?" },
                { english: "Food", turkish: "Yemek", level: "A1", category: "General", example: "The food in this restaurant is delicious.", exampleTurkish: "Bu restoranda yemek lezzetli." },
                { english: "Friend", turkish: "Arkadaş", level: "A1", category: "General", example: "She is my best friend.", exampleTurkish: "O benim en iyi arkadaşım." }
            ],
            travel: [
                { english: "Airport", turkish: "Havalimanı", level: "A1", category: "Travel", example: "We arrived at the airport two hours early.", exampleTurkish: "Havalimanına iki saat erken vardık." },
                { english: "Ticket", turkish: "Bilet", level: "A1", category: "Travel", example: "I bought a ticket for the concert.", exampleTurkish: "Konser için bir bilet aldım." },
                { english: "Hotel", turkish: "Otel", level: "A1", category: "Travel", example: "We stayed at a nice hotel by the beach.", exampleTurkish: "Plaj kenarında güzel bir otelde kaldık." },
                { english: "Passport", turkish: "Pasaport", level: "A1", category: "Travel", example: "Don't forget to bring your passport.", exampleTurkish: "Pasaportunuzu getirmeyi unutmayın." },
                { english: "Taxi", turkish: "Taksi", level: "A1", category: "Travel", example: "We took a taxi from the airport to the hotel.", exampleTurkish: "Havalimanından otele taksiyle gittik." }
            ],
            food: [
                { english: "Bread", turkish: "Ekmek", level: "A1", category: "Food", example: "I like fresh bread for breakfast.", exampleTurkish: "Kahvaltıda taze ekmek severim." },
                { english: "Milk", turkish: "Süt", level: "A1", category: "Food", example: "Do you want some milk in your coffee?", exampleTurkish: "Kahvenizde biraz süt ister misiniz?" },
                { english: "Apple", turkish: "Elma", level: "A1", category: "Food", example: "I eat an apple every day.", exampleTurkish: "Her gün bir elma yerim." },
                { english: "Meat", turkish: "Et", level: "A1", category: "Food", example: "They don't eat meat; they're vegetarians.", exampleTurkish: "Et yemezler; onlar vejetaryendir." },
                { english: "Vegetable", turkish: "Sebze", level: "A1", category: "Food", example: "It's important to eat vegetables every day.", exampleTurkish: "Her gün sebze yemek önemlidir." }
            ],
            family: [
                { english: "Mother", turkish: "Anne", level: "A1", category: "Family", example: "My mother is a doctor.", exampleTurkish: "Annem bir doktordur." },
                { english: "Father", turkish: "Baba", level: "A1", category: "Family", example: "His father works in a bank.", exampleTurkish: "Babası bir bankada çalışıyor." },
                { english: "Sister", turkish: "Kız kardeş", level: "A1", category: "Family", example: "I have one sister and two brothers.", exampleTurkish: "Bir kız kardeşim ve iki erkek kardeşim var." },
                { english: "Brother", turkish: "Erkek kardeş", level: "A1", category: "Family", example: "My brother is three years older than me.", exampleTurkish: "Erkek kardeşim benden üç yaş büyük." },
                { english: "Child", turkish: "Çocuk", level: "A1", category: "Family", example: "The children are playing in the park.", exampleTurkish: "Çocuklar parkta oynuyor." }
            ]
        };
    }

    // A2 seviye kelime havuzları
    get a2WordPools() {
        return {
            learning1: [
                { english: "Weather", turkish: "Hava durumu", level: "A2", category: "Learning1", example: "What's the weather like today?", exampleTurkish: "Bugün hava nasıl?" },
                { english: "Holiday", turkish: "Tatil", level: "A2", category: "Learning1", example: "We're going on holiday next week.", exampleTurkish: "Gelecek hafta tatile gidiyoruz." },
                { english: "Hobby", turkish: "Hobi", level: "A2", category: "Learning1", example: "Reading is my favorite hobby.", exampleTurkish: "Okumak en sevdiğim hobidir." },
                { english: "Job", turkish: "İş", level: "A2", category: "Learning1", example: "She has a new job in the city.", exampleTurkish: "Şehirde yeni bir işi var." },
                { english: "Hospital", turkish: "Hastane", level: "A2", category: "Learning1", example: "My grandfather is in the hospital.", exampleTurkish: "Büyükbabam hastanede." },
                { english: "Medicine", turkish: "İlaç", level: "A2", category: "Learning1", example: "Don't forget to take your medicine.", exampleTurkish: "İlacını almayı unutma." },
                { english: "Appointment", turkish: "Randevu", level: "A2", category: "Learning1", example: "I have a doctor's appointment tomorrow.", exampleTurkish: "Yarın doktor randevum var." },
                { english: "Shopping", turkish: "Alışveriş", level: "A2", category: "Learning1", example: "I need to go shopping for groceries.", exampleTurkish: "Market alışverişine gitmem gerekiyor." },
                { english: "Price", turkish: "Fiyat", level: "A2", category: "Learning1", example: "What's the price of this shirt?", exampleTurkish: "Bu gömleğin fiyatı ne kadar?" },
                { english: "Sale", turkish: "İndirim", level: "A2", category: "Learning1", example: "There's a big sale at the mall this weekend.", exampleTurkish: "Bu hafta sonu alışveriş merkezinde büyük bir indirim var." }
            ],
            learning2: [
                { english: "Restaurant", turkish: "Restoran", level: "A2", category: "Learning2", example: "Let's have dinner at that new restaurant.", exampleTurkish: "O yeni restoranda akşam yemeği yiyelim." },
                { english: "Menu", turkish: "Menü", level: "A2", category: "Learning2", example: "Could I see the menu, please?", exampleTurkish: "Menüyü görebilir miyim, lütfen?" },
                { english: "Bill", turkish: "Hesap", level: "A2", category: "Learning2", example: "Can we have the bill, please?", exampleTurkish: "Hesabı alabilir miyiz, lütfen?" },
                { english: "City", turkish: "Şehir", level: "A2", category: "Learning2", example: "Istanbul is a beautiful city.", exampleTurkish: "İstanbul güzel bir şehirdir." },
                { english: "Country", turkish: "Ülke", level: "A2", category: "Learning2", example: "Which country would you like to visit?", exampleTurkish: "Hangi ülkeyi ziyaret etmek istersiniz?" },
                { english: "Language", turkish: "Dil", level: "A2", category: "Learning2", example: "How many languages do you speak?", exampleTurkish: "Kaç dil konuşuyorsunuz?" },
                { english: "Culture", turkish: "Kültür", level: "A2", category: "Learning2", example: "I'm interested in learning about different cultures.", exampleTurkish: "Farklı kültürler hakkında öğrenmekle ilgileniyorum." },
                { english: "Vacation", turkish: "Tatil", level: "A2", category: "Learning2", example: "We're planning our summer vacation.", exampleTurkish: "Yaz tatilimizi planlıyoruz." },
                { english: "Beach", turkish: "Plaj", level: "A2", category: "Learning2", example: "The beach was crowded on the weekend.", exampleTurkish: "Hafta sonu plaj kalabalıktı." },
                { english: "Mountain", turkish: "Dağ", level: "A2", category: "Learning2", example: "They went hiking in the mountains.", exampleTurkish: "Dağlarda yürüyüşe gittiler." }
            ],
            travel: [
                { english: "Map", turkish: "Harita", level: "A2", category: "Travel", example: "I need a map of the city center.", exampleTurkish: "Şehir merkezinin bir haritasına ihtiyacım var." },
                { english: "Direction", turkish: "Yön", level: "A2", category: "Travel", example: "Could you give me directions to the museum?", exampleTurkish: "Bana müzeye giden yolu tarif edebilir misiniz?" },
                { english: "Trip", turkish: "Seyahat", level: "A2", category: "Travel", example: "How was your trip to Paris?", exampleTurkish: "Paris seyahatiniz nasıldı?" },
                { english: "Journey", turkish: "Yolculuk", level: "A2", category: "Travel", example: "The journey took five hours.", exampleTurkish: "Yolculuk beş saat sürdü." },
                { english: "Tourist", turkish: "Turist", level: "A2", category: "Travel", example: "There are many tourists in the summer.", exampleTurkish: "Yazın çok sayıda turist vardır." }
            ]
        };
    }

    // B1 seviye kelime havuzları
    get b1WordPools() {
        return {
            learning1: [
                { english: "Environment", turkish: "Çevre", level: "B1", category: "Learning1", example: "We need to protect the environment.", exampleTurkish: "Çevreyi korumamız gerekiyor." },
                { english: "Technology", turkish: "Teknoloji", level: "B1", category: "Learning1", example: "Technology is changing our lives rapidly.", exampleTurkish: "Teknoloji hayatımızı hızla değiştiriyor." },
                { english: "Experience", turkish: "Deneyim", level: "B1", category: "Learning1", example: "She has a lot of experience in teaching.", exampleTurkish: "Öğretim konusunda çok deneyimi var." },
                { english: "Opportunity", turkish: "Fırsat", level: "B1", category: "Learning1", example: "This is a great opportunity for your career.", exampleTurkish: "Bu kariyeriniz için harika bir fırsat." },
                { english: "Challenge", turkish: "Zorluk", level: "B1", category: "Learning1", example: "Learning a new language can be a challenge.", exampleTurkish: "Yeni bir dil öğrenmek bir zorluk olabilir." },
                { english: "Decision", turkish: "Karar", level: "B1", category: "Learning1", example: "Making important decisions can be stressful.", exampleTurkish: "Önemli kararlar vermek stresli olabilir." },
                { english: "Relationship", turkish: "İlişki", level: "B1", category: "Learning1", example: "They have a good relationship with their neighbors.", exampleTurkish: "Komşularıyla iyi bir ilişkileri var." },
                { english: "Responsibility", turkish: "Sorumluluk", level: "B1", category: "Learning1", example: "Taking care of a pet is a big responsibility.", exampleTurkish: "Bir evcil hayvana bakmak büyük bir sorumluluktur." },
                { english: "Achievement", turkish: "Başarı", level: "B1", category: "Learning1", example: "Graduating from university was her greatest achievement.", exampleTurkish: "Üniversiteden mezun olmak onun en büyük başarısıydı." },
                { english: "Improvement", turkish: "İyileştirme", level: "B1", category: "Learning1", example: "I can see a lot of improvement in your English.", exampleTurkish: "İngilizcende çok gelişme görüyorum." }
            ]
        };
    }

    // B2 seviye kelime havuzları
    get b2WordPools() {
        return {
            learning1: [
                { english: "Perspective", turkish: "Bakış açısı", level: "B2", category: "Learning1", example: "It's important to consider different perspectives.", exampleTurkish: "Farklı bakış açılarını göz önünde bulundurmak önemlidir." },
                { english: "Consequence", turkish: "Sonuç", level: "B2", category: "Learning1", example: "Every action has consequences.", exampleTurkish: "Her eylemin sonuçları vardır." },
                { english: "Controversy", turkish: "Tartışma", level: "B2", category: "Learning1", example: "The new policy has caused a lot of controversy.", exampleTurkish: "Yeni politika çok fazla tartışmaya neden oldu." },
                { english: "Evaluation", turkish: "Değerlendirme", level: "B2", category: "Learning1", example: "The annual evaluation of employees will begin next week.", exampleTurkish: "Çalışanların yıllık değerlendirmesi gelecek hafta başlayacak." },
                { english: "Phenomenon", turkish: "Fenomen", level: "B2", category: "Learning1", example: "Social media has become a global phenomenon.", exampleTurkish: "Sosyal medya küresel bir fenomen haline geldi." },
                { english: "Distinction", turkish: "Ayrım", level: "B2", category: "Learning1", example: "There's a clear distinction between the two concepts.", exampleTurkish: "İki kavram arasında net bir ayrım var." },
                { english: "Implication", turkish: "Çıkarım", level: "B2", category: "Learning1", example: "We need to consider the implications of this decision.", exampleTurkish: "Bu kararın çıkarımlarını düşünmemiz gerekiyor." },
                { english: "Recommendation", turkish: "Tavsiye", level: "B2", category: "Learning1", example: "The committee will make a recommendation next month.", exampleTurkish: "Komite gelecek ay bir tavsiyede bulunacak." },
                { english: "Assumption", turkish: "Varsayım", level: "B2", category: "Learning1", example: "Your assumption is incorrect.", exampleTurkish: "Varsayımınız yanlış." },
                { english: "Interpretation", turkish: "Yorumlama", level: "B2", category: "Learning1", example: "There are many possible interpretations of this poem.", exampleTurkish: "Bu şiirin birçok olası yorumu var." }
            ]
        };
    }

    // C1 seviye kelime havuzları
    get c1WordPools() {
        return {
            learning1: [
                { english: "Misconception", turkish: "Yanlış anlama", level: "C1", category: "Learning1", example: "There's a common misconception about how this works.", exampleTurkish: "Bunun nasıl çalıştığı hakkında yaygın bir yanlış anlama var." },
                { english: "Substantial", turkish: "Önemli", level: "C1", category: "Learning1", example: "There is substantial evidence to support this theory.", exampleTurkish: "Bu teoriyi destekleyen önemli kanıtlar var." },
                { english: "Nuance", turkish: "İnce ayrım", level: "C1", category: "Learning1", example: "The translation doesn't capture all the nuances of the original text.", exampleTurkish: "Çeviri, orijinal metnin tüm ince ayrımlarını yakalamıyor." },
                { english: "Speculation", turkish: "Tahmin", level: "C1", category: "Learning1", example: "There's a lot of speculation about what might happen next.", exampleTurkish: "Bundan sonra ne olabileceği hakkında çok fazla tahmin var." },
                { english: "Implementation", turkish: "Uygulama", level: "C1", category: "Learning1", example: "The implementation of the new system will take several months.", exampleTurkish: "Yeni sistemin uygulanması birkaç ay sürecek." },
                { english: "Comprehensive", turkish: "Kapsamlı", level: "C1", category: "Learning1", example: "We need a comprehensive review of all procedures.", exampleTurkish: "Tüm prosedürlerin kapsamlı bir incelemesine ihtiyacımız var." },
                { english: "Inevitable", turkish: "Kaçınılmaz", level: "C1", category: "Learning1", example: "Change is inevitable in any organization.", exampleTurkish: "Değişim, herhangi bir organizasyonda kaçınılmazdır." },
                { english: "Controversial", turkish: "Tartışmalı", level: "C1", category: "Learning1", example: "It's a controversial topic that divides opinion.", exampleTurkish: "Görüşleri bölen tartışmalı bir konudur." },
                { english: "Methodology", turkish: "Metodoloji", level: "C1", category: "Learning1", example: "The research methodology has been criticized by other scientists.", exampleTurkish: "Araştırma metodolojisi diğer bilim insanları tarafından eleştirildi." },
                { english: "Unprecedented", turkish: "Benzeri görülmemiş", level: "C1", category: "Learning1", example: "The company has experienced unprecedented growth this year.", exampleTurkish: "Şirket bu yıl benzeri görülmemiş bir büyüme yaşadı." }
            ]
        };
    }

    // Tüm A1 kelimelerini bir dizide getir
    get allA1Words() {
        // Tüm kategorilerdeki kelimeleri bir dizide birleştir
        const allWords = [
            ...this.a1WordPools.learning1,
            ...this.a1WordPools.learning2,
            ...this.a1WordPools.learning3,
            // Diğer kategorileri ekle
        ];

        // Tekrarlanan kelimeleri kaldır (english değerine göre)
        const uniqueWords = [];
        const uniqueEnglishWords = new Set();

        for (const word of allWords) {
            if (!uniqueEnglishWords.has(word.english)) {
                uniqueEnglishWords.add(word.english);
                uniqueWords.push(word);
            }
        }

        return uniqueWords;
    }

    // Eskiden a1Words olarak kullanılan genel havuz için geri uyumluluk
    get a1Words() {
        return this.a1WordPools.general;
    }

    // A1 seviye kelime havuzlarını göster
    showA1WordPools() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let html = `
            <div class="word-learning-container">
                <h2>A1 Kelime Havuzları</h2>
                
                <div class="word-pools">
                    <div class="pool-card" data-pool="learning1" data-level="a1">
                        <h3>Kelime Öğrenme 1</h3>
                        <p>İlk 10 temel kelime</p>
                        <span class="word-count">${this.a1WordPools.learning1.length} kelime</span>
                    </div>
                    
                    <div class="pool-card" data-pool="learning2" data-level="a1">
                        <h3>Kelime Öğrenme 2</h3>
                        <p>İkinci 10 temel kelime</p>
                        <span class="word-count">${this.a1WordPools.learning2.length} kelime</span>
                    </div>
                    
                    <div class="pool-card" data-pool="learning3" data-level="a1">
                        <h3>Kelime Öğrenme 3</h3>
                        <p>Üçüncü 10 temel kelime</p>
                        <span class="word-count">${this.a1WordPools.learning3.length} kelime</span>
                    </div>
                    
                    <div class="pool-card" data-pool="general" data-level="a1">
                        <h3>Genel</h3>
                        <p>Temel günlük ifadeler ve kelimeler</p>
                        <span class="word-count">${this.a1WordPools.general.length} kelime</span>
                    </div>
                    
                    <div class="pool-card" data-pool="travel" data-level="a1">
                        <h3>Seyahat</h3>
                        <p>Seyahat ile ilgili temel kelimeler</p>
                        <span class="word-count">${this.a1WordPools.travel.length} kelime</span>
                    </div>
                    
                    <div class="pool-card" data-pool="food" data-level="a1">
                        <h3>Yiyecek</h3>
                        <p>Temel yiyecek ve içecek kelimeleri</p>
                        <span class="word-count">${this.a1WordPools.food.length} kelime</span>
                    </div>
                    
                    <div class="pool-card" data-pool="family" data-level="a1">
                        <h3>Aile</h3>
                        <p>Aile üyeleriyle ilgili kelimeler</p>
                        <span class="word-count">${this.a1WordPools.family.length} kelime</span>
                    </div>
                </div>
                
                <div class="navigation-controls">
                    <button id="back-to-levels-btn" class="btn">Seviyelere Dön</button>
                    <button id="back-to-dashboard-btn" class="btn">Ana Sayfaya Dön</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listeners for pool selection
        document.querySelectorAll('.pool-card[data-level="a1"]').forEach(card => {
            card.addEventListener('click', (e) => {
                const poolName = e.currentTarget.getAttribute('data-pool');
                this.startLearningA1Pool(poolName);
            });
        });

        document.getElementById('back-to-levels-btn').addEventListener('click', () => this.showLevelSelection());
        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.backToDashboard());
    }

    // Belirli bir A1 kelime havuzunu öğrenmeyi başlat
    startLearningA1Pool(poolName) {
        if (this.a1WordPools[poolName]) {
            this.words = this.a1WordPools[poolName];
            this.currentPool = poolName;
            this.currentWordIndex = 0;
            this.renderWordCard('A1');
            this.setupNavigation();
        } else {
            console.error('Pool not found:', poolName);
        }
    }

    // A2 seviye kelime havuzlarını göster
    showA2WordPools() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let html = `
            <div class="word-learning-container">
                <h2>A2 Kelime Havuzları</h2>
                
                <div class="word-pools">
                    <div class="pool-card" data-pool="learning1" data-level="a2">
                        <h3>Kelime Öğrenme 1</h3>
                        <p>A2 seviye temel kelimeler</p>
                        <span class="word-count">${this.a2WordPools.learning1.length} kelime</span>
                    </div>
                    
                    <div class="pool-card" data-pool="learning2" data-level="a2">
                        <h3>Kelime Öğrenme 2</h3>
                        <p>A2 seviye ek kelimeler</p>
                        <span class="word-count">${this.a2WordPools.learning2.length} kelime</span>
                    </div>
                    
                    <div class="pool-card" data-pool="travel" data-level="a2">
                        <h3>Seyahat</h3>
                        <p>A2 seviye seyahat kelimeleri</p>
                        <span class="word-count">${this.a2WordPools.travel.length} kelime</span>
                    </div>
                </div>
                
                <div class="navigation-controls">
                    <button id="back-to-levels-btn" class="btn">Seviyelere Dön</button>
                    <button id="back-to-dashboard-btn" class="btn">Ana Sayfaya Dön</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listeners for pool selection
        document.querySelectorAll('.pool-card[data-level="a2"]').forEach(card => {
            card.addEventListener('click', (e) => {
                const poolName = e.currentTarget.getAttribute('data-pool');
                this.startLearningA2Pool(poolName);
            });
        });

        document.getElementById('back-to-levels-btn').addEventListener('click', () => this.showLevelSelection());
        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.backToDashboard());
    }

    // B1 seviye kelime havuzlarını göster
    showB1WordPools() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let html = `
            <div class="word-learning-container">
                <h2>B1 Kelime Havuzları</h2>
                
                <div class="word-pools">
                    <div class="pool-card" data-pool="learning1" data-level="b1">
                        <h3>Kelime Öğrenme 1</h3>
                        <p>B1 seviye temel kelimeler</p>
                        <span class="word-count">${this.b1WordPools.learning1.length} kelime</span>
                    </div>
                </div>
                
                <div class="navigation-controls">
                    <button id="back-to-levels-btn" class="btn">Seviyelere Dön</button>
                    <button id="back-to-dashboard-btn" class="btn">Ana Sayfaya Dön</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listeners for pool selection
        document.querySelectorAll('.pool-card[data-level="b1"]').forEach(card => {
            card.addEventListener('click', (e) => {
                const poolName = e.currentTarget.getAttribute('data-pool');
                this.startLearningB1Pool(poolName);
            });
        });

        document.getElementById('back-to-levels-btn').addEventListener('click', () => this.showLevelSelection());
        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.backToDashboard());
    }

    // B2 seviye kelime havuzlarını göster
    showB2WordPools() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let html = `
            <div class="word-learning-container">
                <h2>B2 Kelime Havuzları</h2>
                
                <div class="word-pools">
                    <div class="pool-card" data-pool="learning1" data-level="b2">
                        <h3>Kelime Öğrenme 1</h3>
                        <p>B2 seviye temel kelimeler</p>
                        <span class="word-count">${this.b2WordPools.learning1.length} kelime</span>
                    </div>
                </div>
                
                <div class="navigation-controls">
                    <button id="back-to-levels-btn" class="btn">Seviyelere Dön</button>
                    <button id="back-to-dashboard-btn" class="btn">Ana Sayfaya Dön</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listeners for pool selection
        document.querySelectorAll('.pool-card[data-level="b2"]').forEach(card => {
            card.addEventListener('click', (e) => {
                const poolName = e.currentTarget.getAttribute('data-pool');
                this.startLearningB2Pool(poolName);
            });
        });

        document.getElementById('back-to-levels-btn').addEventListener('click', () => this.showLevelSelection());
        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.backToDashboard());
    }

    // C1 seviye kelime havuzlarını göster
    showC1WordPools() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let html = `
            <div class="word-learning-container">
                <h2>C1 Kelime Havuzları</h2>
                
                <div class="word-pools">
                    <div class="pool-card" data-pool="learning1" data-level="c1">
                        <h3>Kelime Öğrenme 1</h3>
                        <p>C1 seviye temel kelimeler</p>
                        <span class="word-count">${this.c1WordPools.learning1.length} kelime</span>
                    </div>
                </div>
                
                <div class="navigation-controls">
                    <button id="back-to-levels-btn" class="btn">Seviyelere Dön</button>
                    <button id="back-to-dashboard-btn" class="btn">Ana Sayfaya Dön</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listeners for pool selection
        document.querySelectorAll('.pool-card[data-level="c1"]').forEach(card => {
            card.addEventListener('click', (e) => {
                const poolName = e.currentTarget.getAttribute('data-pool');
                this.startLearningC1Pool(poolName);
            });
        });

        document.getElementById('back-to-levels-btn').addEventListener('click', () => this.showLevelSelection());
        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.backToDashboard());
    }

    // Belirli bir A2 kelime havuzunu öğrenmeyi başlat
    startLearningA2Pool(poolName) {
        if (this.a2WordPools[poolName]) {
            this.words = this.a2WordPools[poolName];
            this.currentPool = poolName;
            this.currentWordIndex = 0;
            this.renderWordCard('A2');
            this.setupNavigation();
        } else {
            console.error('Pool not found:', poolName);
        }
    }

    // Belirli bir B1 kelime havuzunu öğrenmeyi başlat
    startLearningB1Pool(poolName) {
        if (this.b1WordPools[poolName]) {
            this.words = this.b1WordPools[poolName];
            this.currentPool = poolName;
            this.currentWordIndex = 0;
            this.renderWordCard('B1');
            this.setupNavigation();
        } else {
            console.error('Pool not found:', poolName);
        }
    }

    // Belirli bir B2 kelime havuzunu öğrenmeyi başlat
    startLearningB2Pool(poolName) {
        if (this.b2WordPools[poolName]) {
            this.words = this.b2WordPools[poolName];
            this.currentPool = poolName;
            this.currentWordIndex = 0;
            this.renderWordCard('B2');
            this.setupNavigation();
        } else {
            console.error('Pool not found:', poolName);
        }
    }

    // Belirli bir C1 kelime havuzunu öğrenmeyi başlat
    startLearningC1Pool(poolName) {
        if (this.c1WordPools[poolName]) {
            this.words = this.c1WordPools[poolName];
            this.currentPool = poolName;
            this.currentWordIndex = 0;
            this.renderWordCard('C1');
            this.setupNavigation();
        } else {
            console.error('Pool not found:', poolName);
        }
    }

    // Kelime öğrenmeyi tamamla
    completeWordLearning() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Kategori ismini daha kullanıcı dostu hale getir
        const categoryLabels = {
            'general': 'Genel',
            'travel': 'Seyahat',
            'food': 'Yiyecek',
            'family': 'Aile',
            'learning1': 'Kelime Öğrenme 1',
            'learning2': 'Kelime Öğrenme 2',
            'learning3': 'Kelime Öğrenme 3'
        };

        const categoryName = categoryLabels[this.currentPool] || this.currentPool;

        // Seviyeyi kelime objesinden veya default olarak A1 olarak al
        const level = this.words.length > 0 ? this.words[0].level : 'A1';

        let html = `
            <div class="completion-container">
                <h2>Tebrikler!</h2>
                <p>${level} ${categoryName} kelime setini tamamladınız.</p>
                <div class="completion-stats">
                    <div class="stat-item">
                        <h3>Öğrenilen Kelimeler</h3>
                        <p>${this.words.length}</p>
                    </div>
                </div>
                <div class="navigation-controls">
                    <button id="restart-learning-btn" class="btn">Bu Havuzu Tekrar Başlat</button>
                    <button id="back-to-pools-btn" class="btn">Diğer Kelime Havuzları</button>
                    <button id="back-to-dashboard-btn" class="btn">Ana Sayfaya Dön</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listeners - seviyeye göre doğru metodu çağır
        document.getElementById('restart-learning-btn').addEventListener('click', () => {
            switch (level) {
                case 'A1':
                    this.startLearningA1Pool(this.currentPool);
                    break;
                case 'A2':
                    this.startLearningA2Pool(this.currentPool);
                    break;
                case 'B1':
                    this.startLearningB1Pool(this.currentPool);
                    break;
                case 'B2':
                    this.startLearningB2Pool(this.currentPool);
                    break;
                case 'C1':
                    this.startLearningC1Pool(this.currentPool);
                    break;
                default:
                    this.startLearningA1Pool(this.currentPool);
            }
        });

        document.getElementById('back-to-pools-btn').addEventListener('click', () => {
            // Seviyeye göre doğru havuz listesini göster
            this.showLevelWordPools(level);
        });

        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.backToDashboard());
    }

    // Kelime kartını oluştur
    renderWordCard(level) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Seviye belirtilmemişse mevcut seviyeyi kullan veya A1 varsay
        if (level) {
            this.currentLevel = level;
        } else if (!this.currentLevel) {
            this.currentLevel = 'A1';
        }

        const currentWord = this.words[this.currentWordIndex];

        // Güvenlik: Kelime bulunamazsa geri dön (hata önleme)
        if (!currentWord) {
            console.error('Kelime bulunamadı, index:', this.currentWordIndex);
            this.showLevelSelection();
            return;
        }

        this.showingTranslation = false;

        // Kategori ismini daha kullanıcı dostu hale getir
        const categoryLabels = {
            'general': 'Genel',
            'travel': 'Seyahat',
            'food': 'Yiyecek',
            'family': 'Aile',
            'learning1': 'Kelime Öğrenme 1',
            'learning2': 'Kelime Öğrenme 2',
            'learning3': 'Kelime Öğrenme 3'
        };

        const categoryName = categoryLabels[this.currentPool] || this.currentPool;

        let html = `
            <div class="word-learning-container">
                <h2>${level} ${categoryName}</h2>
                
                <div class="word-card-wrapper">
                    <div class="word-card" id="current-word-card">
                        <div class="word-card-desktop">
                            <div class="word-info-header">
                                <span class="word-level">${currentWord.level}</span>
                                <span class="word-category">${currentWord.category}</span>
                                <div class="word-card-number">${this.currentWordIndex + 1}/${this.words.length}</div>
                            </div>
                            
                            <table class="word-info-table">
                                <tr style="--row-index: 1;">
                                    <td class="table-label">İngilizce:</td>
                                    <td class="table-content english-word">${currentWord.english}</td>
                                </tr>
                                <tr style="--row-index: 2;">
                                    <td class="table-label">Örnek:</td>
                                    <td class="table-content">${currentWord.example || ''}</td>
                                </tr>
                                <tr class="turkish-row" style="--row-index: 3;">
                                    <td class="table-label">Örnek Türkçe:</td>
                                    <td class="table-content" id="example-turkish-translation" style="opacity:0; transform:translateY(10px);">${currentWord.exampleTurkish || ''}</td>
                                </tr>
                                <tr class="turkish-row" style="--row-index: 4;">
                                    <td class="table-label">Türkçe:</td>
                                    <td class="table-content turkish-word" id="turkish-translation" style="opacity:0; transform:translateY(10px);">${currentWord.turkish}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div class="word-card-mobile">
                            <span class="word-level">${currentWord.level}</span>
                            <span class="word-category">${currentWord.category}</span>
                            <div class="word-card-number">${this.currentWordIndex + 1}/${this.words.length}</div>
                            <div class="word-english">${currentWord.english}</div>
                            <div class="word-example">${currentWord.example || ''}</div>
                            <div class="word-example-turkish" id="example-turkish-translation-mobile" style="opacity:0; transform:translateY(20px);">${currentWord.exampleTurkish || ''}</div>
                            <div class="word-turkish" id="turkish-translation-mobile" style="opacity:0; transform:translateY(20px);">${currentWord.turkish}</div>
                        </div>
                        
                        <div class="word-controls">
                            <button id="show-translation-btn" class="btn">Çeviriyi Göster</button>
                            <button id="next-word-btn" class="btn">
                                ${this.currentWordIndex >= this.words.length - 1 ? 'Tamamla' : 'Sonraki'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="word-progress">
                    ${this.words.map((_, index) =>
            `<div class="word-progress-item ${index <= this.currentWordIndex ? 'active' : ''}" style="--item-index: ${index};"></div>`
        ).join('')}
                </div>
                
                <div class="navigation-controls">
                    <button id="back-to-pools-btn" class="btn">Kelime Havuzlarına Dön</button>
                    <button id="back-to-dashboard-btn" class="btn">Ana Sayfaya Dön</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listeners
        document.getElementById('show-translation-btn').addEventListener('click', () => this.toggleTranslation());
        document.getElementById('next-word-btn').addEventListener('click', (e) => {
            // Butona hızlı tıklanmasını engelle
            e.currentTarget.disabled = true;
            this.nextWord();
        });
        document.getElementById('back-to-pools-btn').addEventListener('click', () => this.showLevelWordPools(this.currentLevel));
        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.backToDashboard());
    }

    // Çeviriyi göster/gizle
    toggleTranslation() {
        this.showingTranslation = !this.showingTranslation;

        // Masaüstü için
        const translationElement = document.getElementById('turkish-translation');
        const exampleTranslationElement = document.getElementById('example-turkish-translation');
        const turkishRows = document.querySelectorAll('.turkish-row');

        // Mobil için
        const translationElementMobile = document.getElementById('turkish-translation-mobile');
        const exampleTranslationElementMobile = document.getElementById('example-turkish-translation-mobile');

        const button = document.getElementById('show-translation-btn');

        if ((translationElement && exampleTranslationElement) ||
            (translationElementMobile && exampleTranslationElementMobile)) {
            if (this.showingTranslation) {
                // Masaüstü
                if (translationElement && exampleTranslationElement) {
                    translationElement.style.opacity = '1';
                    translationElement.style.transform = 'translateY(0)';
                    exampleTranslationElement.style.opacity = '1';
                    exampleTranslationElement.style.transform = 'translateY(0)';

                    // Animasyon sınıfını ekle
                    turkishRows.forEach(row => row.classList.add('show'));
                }

                // Mobil
                if (translationElementMobile && exampleTranslationElementMobile) {
                    translationElementMobile.style.opacity = '1';
                    translationElementMobile.style.transform = 'translateY(0)';
                    translationElementMobile.classList.add('show');

                    exampleTranslationElementMobile.style.opacity = '1';
                    exampleTranslationElementMobile.style.transform = 'translateY(0)';
                    exampleTranslationElementMobile.classList.add('show');
                }

                button.textContent = 'Çeviriyi Gizle';

                // Kelimeyi öğrenildi olarak kaydet
                this.markWordAsLearned(this.words[this.currentWordIndex]);
            } else {
                // Masaüstü
                if (translationElement && exampleTranslationElement) {
                    translationElement.style.opacity = '0';
                    translationElement.style.transform = 'translateY(10px)';
                    exampleTranslationElement.style.opacity = '0';
                    exampleTranslationElement.style.transform = 'translateY(10px)';

                    // Animasyon sınıfını kaldır
                    turkishRows.forEach(row => row.classList.remove('show'));
                }

                // Mobil
                if (translationElementMobile && exampleTranslationElementMobile) {
                    translationElementMobile.style.opacity = '0';
                    translationElementMobile.style.transform = 'translateY(20px)';
                    translationElementMobile.classList.remove('show');

                    exampleTranslationElementMobile.style.opacity = '0';
                    exampleTranslationElementMobile.style.transform = 'translateY(20px)';
                    exampleTranslationElementMobile.classList.remove('show');
                }

                button.textContent = 'Çeviriyi Göster';
            }
        } else {
            console.error('Translation elements not found');
        }
    }

    // CSS animasyonları için stil ekle
    addAnimationStyles() {
        // Stil elementi var mı kontrol et
        let styleElement = document.getElementById('word-learning-styles');

        // Yoksa yeni oluştur
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'word-learning-styles';
            document.head.appendChild(styleElement);

            // Sağa ve sola kaydırma animasyonları için CSS ekle
            styleElement.textContent = `
                .slide-out-right {
                    animation: slideOutRight 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
                    will-change: transform, opacity;
                }
                
                .slide-in-right {
                    animation: slideInRight 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
                    will-change: transform, opacity;
                }
                
                .slide-out-left {
                    animation: slideOutLeft 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
                    will-change: transform, opacity;
                }
                
                .slide-in-left {
                    animation: slideInLeft 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
                    will-change: transform, opacity;
                }
                
                @keyframes slideOutRight {
                    0% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                
                @keyframes slideInRight {
                    0% {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    100% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutLeft {
                    0% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                }
                
                @keyframes slideInLeft {
                    0% {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    100% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
        }
    }

    // Sonraki kelimeye geç
    async nextWord() {
        // Mevcut kelimeyi öğrenildi olarak işaretle
        const currentWord = this.words[this.currentWordIndex];
        if (currentWord) {
            this.markWordAsLearned(currentWord).catch(err => {
                console.error('Kelime kaydedilirken hata (arka planda):', err);
            });
        }

        if (this.currentWordIndex < this.words.length - 1) {
            const currentCard = document.getElementById('current-word-card');

            // Geçiş animasyonu için class ekle
            currentCard.style.animationName = 'slide-out-right';
            currentCard.style.animationDuration = '0.6s';
            currentCard.style.animationFillMode = 'forwards';

            // İçerik alanlarını soluklaştır
            currentCard.querySelector('.word-english')?.classList.add('fade-out');
            currentCard.querySelector('.word-example')?.classList.add('fade-out');

            // Masaüstünde tablo satırlarını soluklaştır
            const tableRows = currentCard.querySelectorAll('.word-info-table tr');
            tableRows.forEach(row => row.classList.add('fade-out'));

            // Animasyon bittikten sonra yeni kelimeyi göster (0.6 saniye)
            setTimeout(() => {
                this.currentWordIndex++;
                this.renderWordCard(this.currentLevel);

                // Yeni kartı animasyonla göster
                requestAnimationFrame(() => {
                    const newCard = document.getElementById('current-word-card');
                    if (newCard) {
                        newCard.style.animationName = 'card-entrance';
                        newCard.style.animationDuration = '0.6s';
                        newCard.style.animationFillMode = 'forwards';

                        // Yeni kelimede ek animasyonlar
                        newCard.querySelector('.word-english')?.classList.add('text-focus-in');
                        newCard.querySelector('.word-example')?.classList.add('text-focus-in');

                        // İlerleme çubuğu animasyonu
                        document.querySelectorAll('.word-progress-item').forEach((item, index) => {
                            item.style.animationDelay = `${index * 0.05}s`;
                        });
                    }
                });
            }, 600);
        } else {
            // Tüm kelimeler tamamlandı
            const currentCard = document.getElementById('current-word-card');

            // Sağa doğru geçiş animasyonu ekle
            currentCard.style.animationName = 'slide-out-right';
            currentCard.style.animationDuration = '0.6s';
            currentCard.style.animationFillMode = 'forwards';

            // Animasyon bittikten sonra tamamlama ekranını göster
            setTimeout(() => {
                this.completeWordLearning();
            }, 600);
        }
    }

    // Kelimeyi öğrenildi olarak işaretle
    async markWordAsLearned(word) {
        try {
            console.log('markWordAsLearned başlatıldı:', {
                userId: this.userId,
                word: word
            });

            if (!this.userId) {
                console.error('Kullanıcı ID bulunamadı!');
                throw new Error('Kullanıcı oturumu bulunamadı');
            }

            // Kelime daha önce öğrenilmiş mi kontrol et
            const q = query(
                collection(db, "learned_words"),
                where("user_id", "==", this.userId),
                where("word_english", "==", word.english)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                await addDoc(collection(db, "learned_words"), {
                    user_id: this.userId,
                    word_english: word.english,
                    word_turkish: word.turkish,
                    level: (word.level || 'A1').toUpperCase(), // Büyük harf garanti
                    category: word.category,
                    learned_at: Timestamp.now(),
                    last_reviewed_at: Timestamp.now(),
                    review_count: 1
                });
                console.log('Kelime kaydedildi:', word.english, 'Seviye:', (word.level || 'A1').toUpperCase());
            } else {
                // Zaten varsa inceleme tarihini güncelle
                const docRef = querySnapshot.docs[0].ref;
                await updateDoc(docRef, {
                    last_reviewed_at: Timestamp.now(),
                    review_count: (querySnapshot.docs[0].data().review_count || 0) + 1
                });
                console.log('Kelime inceleme tarihi güncellendi:', word.english);
            }

            // Öğrenilen kelime sayısını al
            const learnedWordsQuery = query(
                collection(db, "learned_words"),
                where("user_id", "==", this.userId)
            );
            const learnedWordsSnapshot = await getDocs(learnedWordsQuery);
            const learnedWordsCount = learnedWordsSnapshot.size;

            // Kullanıcı ilerlemesini çek
            const progressRef = doc(db, "user_progress", this.userId);
            const progressDoc = await getDoc(progressRef);

            if (!progressDoc.exists()) {
                // Yeni ilerleme kaydı oluştur
                await setDoc(progressRef, {
                    user_id: this.userId,
                    total_learned: learnedWordsCount,
                    last_learned_at: Timestamp.now(),
                    study_streak: 1 // Yeni kayıt olduğu için streak 1
                });
                console.log('Yeni ilerleme kaydı oluşturuldu.');
            } else {
                // Var olanı güncelle
                await updateDoc(progressRef, {
                    total_learned: learnedWordsCount,
                    last_learned_at: Timestamp.now(),
                    // study_streak güncelleme mantığı burada eklenebilir
                });
                console.log('İlerleme kaydı güncellendi.');
            }

            // XP Kazandır
            console.log('XP kazandırma kontrolü yapılıyor...');
            if (typeof window.giveXP === 'function') {
                console.log('window.giveXP fonksiyonu bulundu, 10 XP gönderiliyor...');
                window.giveXP(10, "Yeni kelime öğrendin!");
            } else {
                console.warn('UYARI: window.giveXP fonksiyonu bulunamadı! XP kazanılamadı.');
            }

            // Dashboard'ı güncelle
            if (typeof window.updateDashboard === 'function') {
                await window.updateDashboard();
            }

            console.log('Kelime başarıyla öğrenildi olarak işaretlendi:', word.english);
            return true;

        } catch (error) {
            console.error('Kelime öğrenildi olarak işaretlenirken hata:', error);
            throw error;
        }
    }

    // Kelimeyi öğren butonuna tıklandığında
    async learnWord(word) {
        const success = await this.markWordAsLearned(word);
        if (success) {
            // Başarılı mesajı göster
            alert('Kelime başarıyla öğrenildi olarak işaretlendi!');

            // Kelime listesini güncelle
            this.showWordList();
        } else {
            alert('Kelime öğrenildi olarak işaretlenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
    }

    // Kullanıcı ilerlemesini güncelle
    async updateUserProgress() {
        try {
            if (!this.userId) {
                console.error('Kullanıcı bulunamadı, ilerleme güncellenemedi');
                return;
            }

            console.log('Kullanıcı ilerlemesi güncelleniyor:', this.userId);

            // Önce tüm öğrenilen kelimeleri getir
            const learnedWordsQuery = query(
                collection(db, "learned_words"),
                where("user_id", "==", this.userId)
            );
            const learnedWordsSnapshot = await getDocs(learnedWordsQuery);
            const learnedWordsCount = learnedWordsSnapshot.size;

            // Kullanıcı ilerleme dökümanını al
            const progressRef = doc(db, "user_progress", this.userId);
            const progressDoc = await getDoc(progressRef);

            if (!progressDoc.exists()) {
                // Yeni ilerleme kaydı oluştur
                await setDoc(progressRef, {
                    user_id: this.userId,
                    total_learned: learnedWordsCount,
                    last_learned_at: Timestamp.now(),
                    study_streak: 1
                });
            } else {
                // Mevcut ilerleme kaydını güncelle
                await updateDoc(progressRef, {
                    total_learned: learnedWordsCount,
                    last_learned_at: Timestamp.now()
                });
            }

            console.log('İlerleme kaydı güncellendi. Toplam:', learnedWordsCount);
        } catch (error) {
            console.error('İlerleme güncellenirken hata:', error);
        }
    }

    // Ana menü navigasyonu kur
    setupNavigation() {
        // Ana menüden aktif olan sekmeyi güncelle
        document.querySelectorAll('.main-nav a').forEach(link => {
            if (link.id === 'nav-learn') {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Kelime testi başlat
    async startWordTest() {
        try {
            // Tüm A1 kelimelerini al
            const allAvailableWords = this.allA1Words;

            // Teste daha önce kullanılan kelimeleri filtrele
            const availableWords = allAvailableWords.filter(
                word => !this.usedTestWords.some(used => used.english === word.english)
            );

            // Yeterli kelime yoksa, kullanılan kelimeleri sıfırla
            if (availableWords.length < 10) {
                this.usedTestWords = [];
                // Tüm kelimeleri tekrar kullanılabilir yap
                this.startWordTest();
                return;
            }

            // Kelimeleri karıştır ve 10 kelime seç
            const selectedWords = this.shuffleArray(availableWords).slice(0, 10);

            // Seçilen kelimeleri kullanılmış olarak işaretle
            this.usedTestWords = [...this.usedTestWords, ...selectedWords];

            // Test için kelimeleri ayarla
            this.words = selectedWords;
            this.currentWordIndex = 0;
            this.correctAnswers = 0;
            this.userAnswers = [];

            // Testi başlat
            this.renderWordTest();
        } catch (error) {
            console.error('Error starting word test:', error);
            // Hata durumunda yedek çözüm
            this.words = this.a1WordPools.learning1;
            this.currentWordIndex = 0;
            this.correctAnswers = 0;
            this.userAnswers = [];
            this.renderWordTest();
        }
    }

    // Belirli seviye ve test numarası için quiz başlat
    startSpecificTest(level, testNumber) {
        try {
            console.log('🎯 startSpecificTest çağrıldı:', level, testNumber);
            const levelKey = level.toLowerCase();
            let wordPool = [];

            // Seviyeye göre kelime havuzunu seç
            const poolMap = {
                'a1': this.a1WordPools,
                'a2': this.a2WordPools,
                'b1': this.b1WordPools,
                'b2': this.b2WordPools,
                'c1': this.c1WordPools,
            };

            const pools = poolMap[levelKey];
            if (!pools) {
                console.error('Geçersiz seviye:', level);
                return;
            }

            // Test numarasına göre kelime havuzu seç
            if (testNumber === 1) {
                wordPool = pools.learning1 || [];
            } else if (testNumber === 2) {
                wordPool = pools.learning2 || pools.learning1 || [];
            } else if (testNumber === 3) {
                // Tüm havuzları birleştir ve karıştır
                const allWords = Object.values(pools).flat();
                const unique = [];
                const seen = new Set();
                for (const w of allWords) {
                    if (!seen.has(w.english)) {
                        seen.add(w.english);
                        unique.push(w);
                    }
                }
                wordPool = this.shuffleArray(unique);
            }

            if (wordPool.length === 0) {
                // Bu seviye için yeterli kelime yok, tüm havuzu kullan
                wordPool = pools.learning1 || [];
            }

            // Kaç soru? Test 1=10, Test 2=15, Test 3=20 (varsa)
            const questionCounts = { 1: 10, 2: 15, 3: 20 };
            const count = Math.min(questionCounts[testNumber] || 10, wordPool.length);
            const selectedWords = this.shuffleArray([...wordPool]).slice(0, count);

            console.log('📚 Seçilen kelimeler:', selectedWords.map(w => w.english));

            this.words = selectedWords;
            this.currentWordIndex = 0;
            this.correctAnswers = 0;
            this.userAnswers = [];
            this.currentLevel = levelKey.toUpperCase();

            this.renderWordTest();
        } catch (error) {
            console.error('startSpecificTest hatası:', error);
        }
    }

    // Dizi karıştırma (Fisher-Yates)
    shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Kelime testi görünümünü oluştur
    renderWordTest() {
        this.addAnimationStyles(); // Animasyon stillerini ekle

        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Kalan zamanı sıfırla
        this.remainingTime = 30;

        container.innerHTML = '';

        // Ana div
        const testDiv = document.createElement('div');
        testDiv.className = 'word-test-container';

        // İlerleme bilgisi
        const progressInfo = document.createElement('div');
        progressInfo.className = 'test-progress';
        progressInfo.innerHTML = `<span>Soru ${this.currentWordIndex + 1}/${this.words.length}</span>`;

        // Geri butonu
        if (this.currentWordIndex > 0) {
            const prevButton = document.createElement('button');
            prevButton.id = 'prev-question-btn';
            prevButton.className = 'btn btn-secondary';
            prevButton.textContent = '← Önceki Soru';
            prevButton.addEventListener('click', () => this.goToPreviousQuestion());
            progressInfo.appendChild(prevButton);
        }

        testDiv.appendChild(progressInfo);

        // Soru kartı
        const questionCard = document.createElement('div');
        questionCard.id = 'question-card';
        questionCard.className = 'question-card';

        const currentWord = this.words[this.currentWordIndex];

        questionCard.innerHTML = `
            <div class="question-word">${currentWord.english}</div>
            <div class="question-translation">Bu kelimenin Türkçe karşılığı nedir?</div>
            <div class="options-container" id="options-container"></div>
        `;

        testDiv.appendChild(questionCard);

        // Geri dön butonu
        const backButton = document.createElement('button');
        backButton.className = 'btn btn-secondary back-to-tests-btn';
        backButton.textContent = 'Test Seçimine Dön';
        backButton.addEventListener('click', () => {
            const level = (this.currentLevel || 'a1').toLowerCase();
            if (typeof window.showQuizList === 'function') {
                window.showQuizList(level);
            } else if (typeof window.showQuizTypes === 'function') {
                window.showQuizTypes();
            }
        });
        testDiv.appendChild(backButton);

        container.appendChild(testDiv);

        // Seçenekleri oluştur
        this.renderOptions();
    }

    // Seçenekleri render et
    renderOptions() {
        const optionsContainer = document.getElementById('options-container');
        if (!optionsContainer) return;

        const currentWord = this.words[this.currentWordIndex];

        // Doğru cevap ve yanlış seçenekler oluştur
        let options = this.generateOptions(currentWord);

        // Seçenekleri karıştır
        options = this.shuffleArray(options);

        // Her seçenek için buton oluştur
        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option;
            button.dataset.index = index;
            button.addEventListener('click', () => this.checkAnswer(index, options, currentWord));

            optionsContainer.appendChild(button);
        });
    }

    // Cevabı kontrol et
    checkAnswer(selectedIndex, options, currentWord) {
        const optionButtons = document.querySelectorAll('.option-btn');
        const correctAnswer = currentWord.turkish;
        const selectedOption = options[selectedIndex];

        // Tüm butonları devre dışı bırak
        optionButtons.forEach(btn => {
            btn.disabled = true;
        });

        // Doğru cevabı göster
        optionButtons.forEach((btn, index) => {
            if (options[index] === correctAnswer) {
                btn.classList.add('correct-option');
            }
        });

        // Seçilen cevap doğru mu kontrol et
        if (selectedOption === correctAnswer) {
            optionButtons[selectedIndex].classList.add('correct-option');
            this.correctAnswers++;
        } else {
            optionButtons[selectedIndex].classList.add('wrong-option');
        }

        // Sonraki soruya geçmek için timeout ayarla
        setTimeout(() => {
            this.goToNextQuestion();
        }, 1500);
    }

    // Seçenekler oluştur
    generateOptions(currentWord) {
        // Doğru cevap
        const correctAnswer = currentWord.turkish;

        // Kelime havuzundan 3 rastgele yanlış kelime seç
        const wrongOptions = [];
        const allWords = this.getAllWords();

        while (wrongOptions.length < 3) {
            const randomIndex = Math.floor(Math.random() * allWords.length);
            const randomWord = allWords[randomIndex];

            if (randomWord.turkish !== correctAnswer && !wrongOptions.includes(randomWord.turkish)) {
                wrongOptions.push(randomWord.turkish);
            }
        }

        // Tüm seçenekleri birleştir
        return [correctAnswer, ...wrongOptions];
    }

    // Diziyi karıştır (Fisher-Yates algoritması)
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // Tüm kelimeleri getir (seçenekler için) — mevcut seviyeden
    getAllWords() {
        const levelKey = (this.currentLevel || 'A1').toLowerCase();
        const poolMap = {
            'a1': this.a1WordPools,
            'a2': this.a2WordPools,
            'b1': this.b1WordPools,
            'b2': this.b2WordPools,
            'c1': this.c1WordPools,
        };
        const pools = poolMap[levelKey] || this.a1WordPools;
        let allWords = [];
        Object.values(pools).forEach(pool => {
            allWords = [...allWords, ...pool];
        });
        // En az 4 kelime garantile (yanlış seçenekler için)
        if (allWords.length < 4) {
            Object.values(this.a1WordPools).forEach(pool => {
                allWords = [...allWords, ...pool];
            });
        }
        return allWords;
    }

    // Sonraki soruya geç
    goToNextQuestion() {
        if (this.currentWordIndex < this.words.length - 1) {
            const questionCard = document.getElementById('question-card');

            // Animasyon ile geçiş
            questionCard.classList.add('slide-out-right');

            setTimeout(() => {
                this.currentWordIndex++;
                this.renderWordTest();

                // Yeni kart için giriş animasyonu
                const newCard = document.getElementById('question-card');
                newCard.classList.add('slide-in-right');

                setTimeout(() => {
                    newCard.classList.remove('slide-in-right');
                }, 600);
            }, 600);
        } else {
            // Test tamamlandı, sonuçları göster
            this.showTestResults();
        }
    }

    // Önceki soruya dön
    goToPreviousQuestion() {
        if (this.currentWordIndex > 0) {
            const questionCard = document.getElementById('question-card');

            // Animasyon ile geçiş
            questionCard.classList.add('slide-out-left');

            setTimeout(() => {
                this.currentWordIndex--;
                this.renderWordTest();

                // Yeni kart için giriş animasyonu
                const newCard = document.getElementById('question-card');
                newCard.classList.add('slide-in-left');

                setTimeout(() => {
                    newCard.classList.remove('slide-in-left');
                }, 600);
            }, 600);
        }
    }

    // Test sonuçlarını kaydet
    async saveTestResults() {
        try {
            if (!this.userId) {
                throw new Error('Kullanıcı oturumu bulunamadı');
            }

            const quizData = {
                user_id: this.userId,
                level: (this.currentLevel || 'A1').toUpperCase(),
                correct_count: this.correctAnswers,
                total_questions: this.words.length,
                success_rate: Math.round((this.correctAnswers / this.words.length) * 100),
                created_at: Timestamp.now()
            };

            await addDoc(collection(db, "quiz_results"), quizData);

            console.log('Quiz sonuçları başarıyla kaydedildi');
            return true;
        } catch (error) {
            console.error('Quiz sonuçları kaydedilirken hata oluştu:', error);
            return null;
        }
    }

    // Test sonuçlarını göster
    async showTestResults() {
        try {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            // Sonuç yüzdesini hesapla
            const percentage = Math.round((this.correctAnswers / this.words.length) * 100);

            // Sonuç mesajını ve sınıfını belirle
            let resultMessage, resultClass;
            if (percentage >= 90) {
                resultMessage = "Mükemmel! Harika bir performans gösterdiniz!";
                resultClass = "excellent";
            } else if (percentage >= 70) {
                resultMessage = "İyi iş! Çoğu soruyu doğru yanıtladınız.";
                resultClass = "good";
            } else if (percentage >= 50) {
                resultMessage = "Fena değil. Biraz daha pratik yapmalısınız.";
                resultClass = "average";
            } else {
                resultMessage = "Bu kelimeleri tekrar çalışmanızı öneririz.";
                resultClass = "needs-improvement";
            }

            // Sonuçları kaydet
            try {
                await addDoc(collection(db, "quiz_results"), {
                    user_id: this.userId,
                    level: this.currentLevel || 'a1', // Assuming currentLevel is set
                    correct_count: this.correctAnswers,
                    total_questions: this.words.length,
                    success_rate: percentage,
                    created_at: Timestamp.now()
                });
                console.log('Quiz sonuçları kaydedildi');

                // XP Kazandır
                if (typeof window.giveXP === 'function') {
                    const quizXP = this.correctAnswers * 5;
                    const bonusXP = percentage === 100 ? 50 : 0;
                    const totalQuizXP = quizXP + bonusXP;

                    let reason = `${this.correctAnswers} doğru cevap!`;
                    if (percentage === 100) reason += " (Mükemmel Skor Bonusu!)";

                    if (totalQuizXP > 0) {
                        window.giveXP(totalQuizXP, reason);
                    }
                }
            } catch (error) {
                console.error('Quiz sonuçları kaydedilirken hata:', error);
            }


            // Test sonuçları HTML
            container.innerHTML = `
                <div class="test-results-container">
                    <h2>Test Sonuçları</h2>
                    
                    <div class="result-card ${resultClass}">
                        <div class="result-score">
                            <div class="score-circle">
                                <span class="score-number">${percentage}%</span>
                            </div>
                        </div>
                        
                        <div class="result-details">
                            <p class="result-message">${resultMessage}</p>
                            <p class="score-detail">Toplam Soru: <strong>${this.words.length}</strong></p>
                            <p class="score-detail">Doğru Cevap: <strong>${this.correctAnswers}</strong></p>
                            <p class="score-detail">Yanlış Cevap: <strong>${this.words.length - this.correctAnswers}</strong></p>
                        </div>
                    </div>
                    
                    <div class="result-actions">
                        <button id="restart-test-btn" class="btn btn-primary">Testi Tekrarla</button>
                        <button id="back-to-tests-btn" class="btn btn-secondary">Test Seçimine Dön</button>
                        <button id="back-to-dashboard-btn" class="btn btn-secondary">Ana Sayfaya Dön</button>
                    </div>
                </div>
            `;

            // Buton işlevlerini ekle
            const restartButton = document.getElementById('restart-test-btn');
            const backToTestsButton = document.getElementById('back-to-tests-btn');
            const backToDashboardButton = document.getElementById('back-to-dashboard-btn');

            if (restartButton) {
                restartButton.addEventListener('click', () => {
                    this.currentWordIndex = 0;
                    this.correctAnswers = 0;
                    this.renderWordTest();
                });
            }

            if (backToTestsButton) {
                backToTestsButton.addEventListener('click', () => {
                    this.showTestOptions();
                });
            }

            if (backToDashboardButton) {
                backToDashboardButton.addEventListener('click', () => {
                    this.backToDashboard();
                });
            }
        } catch (error) {
            console.error('Error in showTestResults:', error);
        }
    }

    // Ana sayfaya dön
    backToDashboard() {
        try {
            // Tüm içerikleri gizle
            document.querySelectorAll('.content > div').forEach(div => div.classList.add('hide'));

            // Dashboard içeriğini göster
            const dashboardContent = document.getElementById('dashboard-content');
            if (dashboardContent) {
                dashboardContent.classList.remove('hide');

                // Ana menüden aktif olan sekmeyi güncelle
                document.querySelectorAll('.main-nav a').forEach(link => {
                    if (link.id === 'nav-dashboard') {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });

                // Dashboard'ı yenile
                if (window.Dashboard) {
                    const dashboard = new Dashboard('dashboard-content', this.userId);
                    dashboard.init();
                }
            } else {
                console.error('Dashboard content element not found');
            }
        } catch (error) {
            console.error('Error in backToDashboard:', error);
        }
    }

    // Ana seviye seçim ekranını göster
    showLevelSelection() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let html = `
            <div class="level-selection-container">
                <h2>İngilizce Seviyenizi Seçin</h2>
                
                <div class="level-cards">
                    <div class="level-card" data-level="a1">
                        <h3>A1 (Başlangıç)</h3>
                        <p>Temel ifadeler ve günlük ihtiyaçlarla ilgili basit cümleler.</p>
                        <button class="btn level-btn">A1 Seviyesine Git</button>
                    </div>
                    
                    <div class="level-card" data-level="a2">
                        <h3>A2 (Temel)</h3>
                        <p>Günlük hayatta sık kullanılan ifadeler ve basit iletişim.</p>
                        <button class="btn level-btn">A2 Seviyesine Git</button>
                    </div>
                    
                    <div class="level-card" data-level="b1">
                        <h3>B1 (Orta)</h3>
                        <p>Seyahat, iş ve güncel olaylar hakkında daha karmaşık cümleler.</p>
                        <button class="btn level-btn">B1 Seviyesine Git</button>
                    </div>
                    
                    <div class="level-card" data-level="b2">
                        <h3>B2 (Orta-Üstü)</h3>
                        <p>Teknik konular ve soyut kavramlar hakkında detaylı konuşma.</p>
                        <button class="btn level-btn">B2 Seviyesine Git</button>
                    </div>
                    
                    <div class="level-card" data-level="c1">
                        <h3>C1 (İleri)</h3>
                        <p>Akademik ve profesyonel dil kullanımı, karmaşık metinler.</p>
                        <button class="btn level-btn">C1 Seviyesine Git</button>
                    </div>
                </div>
                
                <div class="navigation-controls">
                    <button id="back-to-dashboard-btn" class="btn">Ana Sayfaya Dön</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listeners for level selection
        document.querySelectorAll('.level-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const level = e.currentTarget.getAttribute('data-level');
                this.showLevelWordPools(level);
            });
        });

        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.backToDashboard());
    }

    // Seçilen seviyenin kelime havuzlarını göster
    showLevelWordPools(level) {
        switch (level.toLowerCase()) {
            case 'a1':
                this.showA1WordPools();
                break;
            case 'a2':
                this.showA2WordPools();
                break;
            case 'b1':
                this.showB1WordPools();
                break;
            case 'b2':
                this.showB2WordPools();
                break;
            case 'c1':
                this.showC1WordPools();
                break;
            default:
                this.showA1WordPools(); // Default olarak A1 göster
        }
    }

    // A1 seviye kelimeleri öğrenmeyi başlat (genel havuz - geriye uyumluluk için)
    startLearningA1() {
        this.startLearningA1Pool('general');
    }

    // Show available tests
    showTestOptions() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Test seçeneklerini sıfırla
        this.testIndex = 0;
        this.usedTestWords = [];

        let html = `
            <div class="word-learning-container">
                <h2>A1 Kelime Testleri</h2>
                
                <div class="word-pools">
                    <div class="pool-card" data-test="1">
                        <h3>Test 1</h3>
                        <p>İlk 10 kelimelik test</p>
                        <span class="word-count">10 soru</span>
                    </div>
                    
                    <div class="pool-card" data-test="2">
                        <h3>Test 2</h3>
                        <p>İkinci 10 kelimelik test</p>
                        <span class="word-count">10 soru</span>
                    </div>
                    
                    <div class="pool-card" data-test="3">
                        <h3>Test 3</h3>
                        <p>Üçüncü 10 kelimelik test</p>
                        <span class="word-count">10 soru</span>
                    </div>
                </div>
                
                <div class="navigation-controls">
                    <button id="back-to-dashboard-btn" class="btn">Ana Sayfaya Dön</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listeners for test selection
        document.querySelectorAll('.pool-card[data-test]').forEach(card => {
            card.addEventListener('click', (e) => {
                const testNumber = parseInt(e.currentTarget.getAttribute('data-test'));
                this.startSpecificTest(testNumber);
            });
        });

        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.backToDashboard());
    }

    // Belirli bir testi başlat
    startSpecificTest(level) {
        try {
            // Test seviyesini ayarla
            this.currentLevel = level;

            // Tüm kelimeleri al
            const allAvailableWords = this.allA1Words;

            // Test için 10 kelime seç
            let selectedWords = this.shuffleArray([...allAvailableWords]).slice(0, 10);

            // Test için kelimeleri ayarla
            this.words = selectedWords;
            this.currentWordIndex = 0;
            this.correctAnswers = 0;
            this.userAnswers = [];

            // Testi başlat
            this.renderWordTest();
        } catch (error) {
            console.error('Error starting specific test:', error);
            // Hata durumunda yedek çözüm
            this.words = this.a1WordPools.learning1;
            this.currentWordIndex = 0;
            this.correctAnswers = 0;
            this.userAnswers = [];
            this.renderWordTest();
        }
    }

    // Kelime listesini göster
    showWordList() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let html = `
            <div class="word-list-container">
                <h2>Kelime Listesi</h2>
                <div class="word-list-filters">
                    <select id="levelFilter">
                        <option value="all">Tüm Seviyeler</option>
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C1">C1</option>
                    </select>
                    <select id="categoryFilter">
                        <option value="all">Tüm Kategoriler</option>
                        <option value="Learning1">Öğrenme 1</option>
                        <option value="Learning2">Öğrenme 2</option>
                        <option value="Learning3">Öğrenme 3</option>
                        <option value="General">Genel</option>
                        <option value="Travel">Seyahat</option>
                        <option value="Food">Yiyecek</option>
                        <option value="Family">Aile</option>
                    </select>
                    <input type="text" id="searchWord" placeholder="Kelime ara...">
                </div>
                <div class="word-list" id="wordList">
                    <table>
                        <thead>
                            <tr>
                                <th>İngilizce</th>
                                <th>Türkçe</th>
                                <th>Örnek Cümle</th>
                                <th>Seviye</th>
                                <th>Kategori</th>
                            </tr>
                        </thead>
                        <tbody id="wordListBody">
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Filtreleme ve arama olaylarını ekle
        this.setupWordListEvents();

        // İlk yüklemede tüm kelimeleri göster
        this.filterWords();
    }

    // Kelime listesi olaylarını ayarla
    setupWordListEvents() {
        const levelFilter = document.getElementById('levelFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const searchWord = document.getElementById('searchWord');

        if (levelFilter) {
            levelFilter.addEventListener('change', () => this.filterWords());
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterWords());
        }

        if (searchWord) {
            searchWord.addEventListener('input', () => this.filterWords());
        }
    }

    // Kelimeleri filtrele ve göster
    filterWords() {
        const levelFilter = document.getElementById('levelFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const searchWord = document.getElementById('searchWord');
        const wordListBody = document.getElementById('wordListBody');

        if (!wordListBody) return;

        const level = levelFilter ? levelFilter.value : 'all';
        const category = categoryFilter ? categoryFilter.value : 'all';
        const search = searchWord ? searchWord.value.toLowerCase() : '';

        // Tüm kelimeleri al
        let allWords = [];

        // A1 kelimeleri
        Object.values(this.a1WordPools).forEach(pool => {
            allWords = allWords.concat(pool);
        });

        // A2 kelimeleri
        Object.values(this.a2WordPools).forEach(pool => {
            allWords = allWords.concat(pool);
        });

        // B1 kelimeleri
        Object.values(this.b1WordPools).forEach(pool => {
            allWords = allWords.concat(pool);
        });

        // B2 kelimeleri
        Object.values(this.b2WordPools).forEach(pool => {
            allWords = allWords.concat(pool);
        });

        // C1 kelimeleri
        Object.values(this.c1WordPools).forEach(pool => {
            allWords = allWords.concat(pool);
        });

        // Filtreleme
        const filteredWords = allWords.filter(word => {
            const levelMatch = level === 'all' || word.level === level;
            const categoryMatch = category === 'all' || word.category === category;
            const searchMatch = search === '' ||
                word.english.toLowerCase().includes(search) ||
                word.turkish.toLowerCase().includes(search);

            return levelMatch && categoryMatch && searchMatch;
        });

        // Kelimeleri tabloya ekle
        let html = '';
        filteredWords.forEach(word => {
            html += `
                <tr>
                    <td>${word.english}</td>
                    <td>${word.turkish}</td>
                    <td>
                        <div class="example">
                            <div>${word.example}</div>
                            <div>${word.exampleTurkish}</div>
                        </div>
                    </td>
                    <td>${word.level}</td>
                    <td>${word.category}</td>
                </tr>
            `;
        });

        wordListBody.innerHTML = html;
    }

    // Kelime havuzunu göster
    showWordPool(level, category) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const words = this.getWordPool(level, category);
        if (!words || words.length === 0) {
            container.innerHTML = '<p>Bu seviye için kelime bulunamadı.</p>';
            return;
        }

        let html = `
            <div class="word-pool-container">
                <h2>${level.toUpperCase()} Seviyesi - ${category} Kelimeleri</h2>
                <div class="word-cards">
        `;

        words.forEach(word => {
            html += `
                <div class="word-card">
                    <div class="word-front">
                        <h3>${word.english}</h3>
                        <p class="word-phonetic">${word.phonetic || ''}</p>
                    </div>
                    <div class="word-back hide">
                        <h3>${word.turkish}</h3>
                        <div class="example-sentence">
                            <p>${word.example}</p>
                            <p class="translation">${word.exampleTurkish}</p>
                        </div>
                    </div>
                    <div class="word-actions">
                        <button class="show-translation">Çeviriyi Göster</button>
                        <button class="learn-word" data-word='${JSON.stringify(word)}'>Öğrendim</button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Çeviri göster/gizle butonlarına olay dinleyicileri ekle
        container.querySelectorAll('.show-translation').forEach(button => {
            button.addEventListener('click', function () {
                const card = this.closest('.word-card');
                const back = card.querySelector('.word-back');
                const isHidden = back.classList.contains('hide');

                if (isHidden) {
                    back.classList.remove('hide');
                    this.textContent = 'Çeviriyi Gizle';
                } else {
                    back.classList.add('hide');
                    this.textContent = 'Çeviriyi Göster';
                }
            });
        });

        // Öğrendim butonlarına olay dinleyicileri ekle
        container.querySelectorAll('.learn-word').forEach(button => {
            button.addEventListener('click', async () => {
                const word = JSON.parse(button.dataset.word);
                await this.learnWord(word);
            });
        });
    }
}

// Export the WordLearning class
window.WordLearning = WordLearning;