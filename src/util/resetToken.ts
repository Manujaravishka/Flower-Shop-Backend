import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface IResetTokenPayload {
    sub: string;
    email: string;
    jti: string;
    iat: number;
    exp: number;
}

export interface IResetToken {
    token: string;
    expiresAt: Date;
    jti: string;
}

const secret = (): string => {
    const value = process.env.JWT_RESET_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!value || value.length < 32) {
        throw new Error("JWT_RESET_SECRET (or fallback JWT_ACCESS_SECRET) must be >= 32 chars");
    }
    return value;
};

const b64url = (buf: Buffer): string =>
    buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string): Buffer => {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
};

const sign = (payload: object, key: string): string => {
    const header = { alg: "HS256", typ: "JWT" };
    const headerB64 = b64url(Buffer.from(JSON.stringify(header)));
    const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
    const data = `${headerB64}.${payloadB64}`;
    const sig = crypto.createHmac("sha256", key).update(data).digest();
    return `${data}.${b64url(sig)}`;
};

const verify = (token: string, key: string): IResetTokenPayload | null => {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts as [string, string, string];
    const data = `${h}.${p}`;
    const expected = b64url(crypto.createHmac("sha256", key).update(data).digest());
    if (expected !== s) return null;
    try {
        const payload = JSON.parse(fromB64url(p).toString("utf8")) as IResetTokenPayload;
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
};

export const issueResetToken = (sub: string, email: string): IResetToken => {
    const jti = crypto.randomBytes(16).toString("hex");
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + Math.floor(RESET_TOKEN_TTL_MS / 1000);
    const token = sign({ sub, email, jti, iat, exp }, secret());
    return { token, expiresAt: new Date(exp * 1000), jti };
};

export const verifyResetToken = (token: string): IResetTokenPayload | null =>
    verify(token, secret());
