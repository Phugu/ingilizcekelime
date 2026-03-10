/* Firebase Security Initializer v2 - Protected Build */
import { initializeApp as _0xinit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth as _0xauth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore as _0xfs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics as _0xan } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getStorage as _0xst } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Protected Configuration Store
const _0x1a2b = [
    "QUl6YVN5QUh2TFhmS1R6blNYaFJCWnlKX1lVVi12OHIzblV2N0RZ",
    "aW5naWxpemNla2VsaW1lLWNiZWI2LmZpcmViYXNlYXBwLmNvbQ==",
    "aW5naWxpemNla2VsaW1lLWNiZWI2",
    "aW5naWxpemNla2VsaW1lLWNiZWI2LmZpcmViYXNlc3RvcmFnZS5hcHA=",
    "NDEzNTgyNTcxMjM2",
    "MTo0MTM1ODI1NzEyMzY6d2ViOjdiOTA4ZjY4M2JjNWUzOWY1MmRlZjE=",
    "Ry1YUjlHTUpZOEpG"
];

const _0xdec = (arr, i) => atob(arr[i]);

const _0xfbConfig = {
    apiKey: _0xdec(_0x1a2b, 0),
    authDomain: _0xdec(_0x1a2b, 1),
    projectId: _0xdec(_0x1a2b, 2),
    storageBucket: _0xdec(_0x1a2b, 3),
    messagingSenderId: _0xdec(_0x1a2b, 4),
    appId: _0xdec(_0x1a2b, 5),
    measurementId: _0xdec(_0x1a2b, 6)
};

const _0xapp = _0xinit(_0xfbConfig);
const _0xanalytics = _0xan(_0xapp);

// Expose internal logic masked 
window[_0xdec(["ZmlyZWJhc2VBcHA="], 0)] = _0xapp;
window[_0xdec(["ZmlyZWJhc2VBdXRo"], 0)] = _0xauth(_0xapp);
window[_0xdec(["ZmlyZXN0b3Jl"], 0)] = _0xfs(_0xapp);
window[_0xdec(["ZmlyZWJhc2VTdG9yYWdl"], 0)] = _0xst(_0xapp);

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkSession === 'function') {
        window.checkSession();
    }
});