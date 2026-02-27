import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAHvLXfKTznSXhRBZyJ_YUV-v8r3nUv7DY",
    authDomain: "ingilizcekelime-cbeb6.firebaseapp.com",
    projectId: "ingilizcekelime-cbeb6",
    storageBucket: "ingilizcekelime-cbeb6.firebasestorage.app",
    messagingSenderId: "413582571236",
    appId: "1:413582571236:web:7b908f683bc5e39f52def1",
    measurementId: "G-XR9GMJY8JF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Expose Firebase services to window for compatibility with existing scripts
window.firebaseApp = app;
window.firebaseAuth = getAuth(app);
window.firestore = getFirestore(app);

// console.log("Firebase initialized successfully");

// Wait for DOM and then check session
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkSession === 'function') {
        window.checkSession();
    }
});
