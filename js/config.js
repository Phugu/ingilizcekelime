// Application Configuration File - PROTECTED DEBUG MODE
(function () {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // DEBUG: Geliştirme sürecinde logları serbest bırakıyoruz
    console.log = function (...args) {
        originalConsoleLog.apply(console, args);
    };

    console.error = function (...args) {
        originalConsoleError.apply(console, args);
    };

    console.warn = function (...args) {
        originalConsoleWarn.apply(console, args);
    };

    console.log("🛠️ DEBUG: Konsol koruması geçici olarak devre dışı bırakıldı. Tüm loglar görülebilir.");
})(); 