import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const principal = (req as AuthRequest).user;

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
        } else {
            console.log(line);
        }
    });

    next();
};
