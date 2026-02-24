// Application Configuration File
// Security layer that protects sensitive information in console methods
(function () {
    // Generic sensitive information patterns
    const sensitivePatterns = [
        'apiKey',
        'authDomain',
        'projectId'
    ];

    // Store original console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;

    // Check if contains sensitive information
    function containsSensitiveInfo(args) {
        return args.some(arg => {
            if (typeof arg === 'string') {
                return sensitivePatterns.some(pattern => arg.includes(pattern));
            } else if (typeof arg === 'object' && arg !== null) {
                const str = JSON.stringify(arg);
                return sensitivePatterns.some(pattern => str.includes(pattern));
            }
            return false;
        });
    }

    // Wrap console methods with protective layer
    console.log = function (...args) {
        if (containsSensitiveInfo(args)) {
            originalConsoleLog.call(console, '[SENSITIVE INFO REDACTED]');
            return;
        }
        originalConsoleLog.apply(console, args);
    };

    console.error = function (...args) {
        if (containsSensitiveInfo(args)) {
            originalConsoleError.call(console, '[SENSITIVE ERROR INFO REDACTED]');
            return;
        }
        originalConsoleError.apply(console, args);
    };

    console.warn = function (...args) {
        if (containsSensitiveInfo(args)) {
            originalConsoleWarn.call(console, '[SENSITIVE WARNING INFO REDACTED]');
            return;
        }
        originalConsoleWarn.apply(console, args);
    };

    console.info = function (...args) {
        if (containsSensitiveInfo(args)) {
            originalConsoleInfo.call(console, '[SENSITIVE INFO REDACTED]');
            return;
        }
        originalConsoleInfo.apply(console, args);
    };

    // Security utilities for development
    window.securityUtils = {
        isSensitiveData: containsSensitiveInfo,
        sanitizeErrorForLogging: function (error) {
            if (!error) return { message: 'Unknown error' };

            // Return cleaned copy of error object
            return {
                code: error.code,
                message: error.message,
                hint: error.hint
            };
        }
    };
})(); 