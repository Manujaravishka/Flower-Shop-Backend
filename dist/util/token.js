"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuthResponse = exports.verifyCustomerRefreshToken = exports.verifyCustomerAccessToken = exports.verifyUserRefreshToken = exports.verifyUserAccessToken = exports.signCustomerRefreshToken = exports.signCustomerAccessToken = exports.signUserRefreshToken = exports.signUserAccessToken = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const PLACEHOLDER_PATTERNS = [/^replace_with_/i, /^your_/i, /^changeme/i];
const isPlaceholder = (value) => {
    if (!value)
        return true;
    const trimmed = value.trim();
    if (trimmed.length < 32)
        return true;
    return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
};
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const getAccessSecret = () => {
    if (!JWT_ACCESS_SECRET || isPlaceholder(JWT_ACCESS_SECRET)) {
        throw new Error("JWT_ACCESS_SECRET must be defined as a strong non-placeholder secret");
    }
    return JWT_ACCESS_SECRET;
};
const getRefreshSecret = () => {
    if (!JWT_REFRESH_SECRET || isPlaceholder(JWT_REFRESH_SECRET)) {
        throw new Error("JWT_REFRESH_SECRET must be defined as a strong non-placeholder secret");
    }
    return JWT_REFRESH_SECRET;
};
const buildOptions = (expiresIn) => ({
    expiresIn: expiresIn,
});
const sign = (id, email, role, type, secret, expiresIn) => {
    const payload = { sub: id, email, role, type };
    return jsonwebtoken_1.default.sign(payload, secret, buildOptions(expiresIn));
};
const signUserAccessToken = (user) => sign(user._id.toString(), user.email, user.role || "admin", "user", getAccessSecret(), ACCESS_EXPIRES_IN);
exports.signUserAccessToken = signUserAccessToken;
const signUserRefreshToken = (user) => sign(user._id.toString(), user.email, user.role || "admin", "user", getRefreshSecret(), REFRESH_EXPIRES_IN);
exports.signUserRefreshToken = signUserRefreshToken;
const signCustomerAccessToken = (customer) => sign(customer._id.toString(), customer.email, "customer", "customer", getAccessSecret(), ACCESS_EXPIRES_IN);
exports.signCustomerAccessToken = signCustomerAccessToken;
const signCustomerRefreshToken = (customer) => sign(customer._id.toString(), customer.email, "customer", "customer", getRefreshSecret(), REFRESH_EXPIRES_IN);
exports.signCustomerRefreshToken = signCustomerRefreshToken;
const verifyToken = (token, secret) => {
    const decoded = jsonwebtoken_1.default.verify(token, secret);
    if (!decoded.type || !decoded.role) {
        throw new jsonwebtoken_1.default.JsonWebTokenError("Token missing type/role claim");
    }
    return decoded;
};
const verifyUserAccessToken = (token) => verifyToken(token, getAccessSecret());
exports.verifyUserAccessToken = verifyUserAccessToken;
const verifyUserRefreshToken = (token) => verifyToken(token, getRefreshSecret());
exports.verifyUserRefreshToken = verifyUserRefreshToken;
const verifyCustomerAccessToken = (token) => verifyToken(token, getAccessSecret());
exports.verifyCustomerAccessToken = verifyCustomerAccessToken;
const verifyCustomerRefreshToken = (token) => verifyToken(token, getRefreshSecret());
exports.verifyCustomerRefreshToken = verifyCustomerRefreshToken;
const buildAuthResponse = (user, accessToken, refreshToken, message = "Authentication successful") => ({
    success: true,
    message,
    data: {
        user,
        accessToken,
        refreshToken,
    },
});
exports.buildAuthResponse = buildAuthResponse;
