"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const principal = req.user;
    res.on("finish", () => {
        const duration = Date.now() - start;
        const line = [
            new Date().toISOString(),
            req.method,
            req.originalUrl,
            res.statusCode,
            `${duration}ms`,
            principal ? `user=${principal.sub}(${principal.role})` : "anon",
        ].join(" ");
        if (res.statusCode >= 500) {
            console.error(line);
        }
        else {
            console.log(line);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
