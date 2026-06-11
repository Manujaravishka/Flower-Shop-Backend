"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearResetTokenCookie = exports.clearCustomerRefreshTokenCookie = exports.clearRefreshTokenCookie = exports.setResetTokenCookie = exports.setCustomerRefreshTokenCookie = exports.setRefreshTokenCookie = exports.RESET_TOKEN_COOKIE = exports.CUSTOMER_REFRESH_TOKEN_COOKIE = exports.REFRESH_TOKEN_COOKIE = void 0;
const isProd = (process.env.NODE_ENV || "development") === "production";
const baseCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax"),
    path: "/",
};
exports.REFRESH_TOKEN_COOKIE = "refreshToken";
exports.CUSTOMER_REFRESH_TOKEN_COOKIE = "customerRefreshToken";
exports.RESET_TOKEN_COOKIE = "resetToken";
const setRefreshTokenCookie = (res, token) => {
    res.cookie(exports.REFRESH_TOKEN_COOKIE, token, {
        ...baseCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};
exports.setRefreshTokenCookie = setRefreshTokenCookie;
const setCustomerRefreshTokenCookie = (res, token) => {
    res.cookie(exports.CUSTOMER_REFRESH_TOKEN_COOKIE, token, {
        ...baseCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};
exports.setCustomerRefreshTokenCookie = setCustomerRefreshTokenCookie;
const setResetTokenCookie = (res, token) => {
    res.cookie(exports.RESET_TOKEN_COOKIE, token, {
        ...baseCookieOptions,
        maxAge: 15 * 60 * 1000,
    });
};
exports.setResetTokenCookie = setResetTokenCookie;
const clearRefreshTokenCookie = (res) => {
    res.clearCookie(exports.REFRESH_TOKEN_COOKIE, baseCookieOptions);
};
exports.clearRefreshTokenCookie = clearRefreshTokenCookie;
const clearCustomerRefreshTokenCookie = (res) => {
    res.clearCookie(exports.CUSTOMER_REFRESH_TOKEN_COOKIE, baseCookieOptions);
};
exports.clearCustomerRefreshTokenCookie = clearCustomerRefreshTokenCookie;
const clearResetTokenCookie = (res) => {
    res.clearCookie(exports.RESET_TOKEN_COOKIE, baseCookieOptions);
};
exports.clearResetTokenCookie = clearResetTokenCookie;
