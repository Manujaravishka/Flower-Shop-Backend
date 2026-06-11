"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyResetToken = exports.issueResetToken = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
dotenv_1.default.config();
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const secret = () => {
    const value = process.env.JWT_RESET_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!value || value.length < 32) {
        throw new Error("JWT_RESET_SECRET (or fallback JWT_ACCESS_SECRET) must be >= 32 chars");
    }
    return value;
};
const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
};
const sign = (payload, key) => {
    const header = { alg: "HS256", typ: "JWT" };
    const headerB64 = b64url(Buffer.from(JSON.stringify(header)));
    const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
    const data = `${headerB64}.${payloadB64}`;
    const sig = crypto_1.default.createHmac("sha256", key).update(data).digest();
    return `${data}.${b64url(sig)}`;
};
const verify = (token, key) => {
    const parts = token.split(".");
    if (parts.length !== 3)
        return null;
    const [h, p, s] = parts;
    const data = `${h}.${p}`;
    const expected = b64url(crypto_1.default.createHmac("sha256", key).update(data).digest());
    if (expected !== s)
        return null;
    try {
        const payload = JSON.parse(fromB64url(p).toString("utf8"));
        if (payload.exp && payload.exp * 1000 < Date.now())
            return null;
        return payload;
    }
    catch {
        return null;
    }
};
const issueResetToken = (sub, email) => {
    const jti = crypto_1.default.randomBytes(16).toString("hex");
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + Math.floor(RESET_TOKEN_TTL_MS / 1000);
    const token = sign({ sub, email, jti, iat, exp }, secret());
    return { token, expiresAt: new Date(exp * 1000), jti };
};
exports.issueResetToken = issueResetToken;
const verifyResetToken = (token) => verify(token, secret());
exports.verifyResetToken = verifyResetToken;
