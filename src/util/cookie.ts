import { Response } from "express";

const isProd = (process.env.NODE_ENV || "development") === "production";

const baseCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    path: "/",
};

export const REFRESH_TOKEN_COOKIE = "refreshToken";
export const CUSTOMER_REFRESH_TOKEN_COOKIE = "customerRefreshToken";
export const RESET_TOKEN_COOKIE = "resetToken";

export const setRefreshTokenCookie = (res: Response, token: string) => {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
        ...baseCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

export const setCustomerRefreshTokenCookie = (res: Response, token: string) => {
    res.cookie(CUSTOMER_REFRESH_TOKEN_COOKIE, token, {
        ...baseCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

export const setResetTokenCookie = (res: Response, token: string) => {
    res.cookie(RESET_TOKEN_COOKIE, token, {
        ...baseCookieOptions,
        maxAge: 15 * 60 * 1000,
    });
};

export const clearRefreshTokenCookie = (res: Response) => {
    res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions);
};

export const clearCustomerRefreshTokenCookie = (res: Response) => {
    res.clearCookie(CUSTOMER_REFRESH_TOKEN_COOKIE, baseCookieOptions);
};

export const clearResetTokenCookie = (res: Response) => {
    res.clearCookie(RESET_TOKEN_COOKIE, baseCookieOptions);
};
