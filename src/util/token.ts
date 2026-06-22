import dotenv from "dotenv";
import jwt, { SignOptions } from "jsonwebtoken";
import { IUser } from "../model/user.Modal";
import { ICustomer } from "../model/customer.modal";

dotenv.config();

const PLACEHOLDER_PATTERNS = [/^replace_with_/i, /^your_/i, /^changeme/i];

const isPlaceholder = (value: string | undefined): boolean => {
    if (!value) return true;
    const trimmed = value.trim();
    if (trimmed.length < 32) return true;
    return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
};
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";
const ACCESS_EXPIRES_IN: string = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const getAccessSecret = (): string => {
    if (!JWT_ACCESS_SECRET || isPlaceholder(JWT_ACCESS_SECRET)) {
        throw new Error("JWT_ACCESS_SECRET must be defined as a strong non-placeholder secret");
    }
    return JWT_ACCESS_SECRET;
};

const getRefreshSecret = (): string => {
    if (!JWT_REFRESH_SECRET || isPlaceholder(JWT_REFRESH_SECRET)) {
        throw new Error("JWT_REFRESH_SECRET must be defined as a strong non-placeholder secret");
    }
    return JWT_REFRESH_SECRET;
};

export type PrincipalType = "user" | "customer";
export type Role = "admin" | "superadmin" | "customer";

export interface ITokenPayload {
    sub: string;
    email?: string;
    role: Role;
    type: PrincipalType;
    iat?: number;
    exp?: number;
}

const buildOptions = (expiresIn: string | number): SignOptions => ({
    expiresIn: expiresIn as SignOptions["expiresIn"],
});

const sign = (
    id: string,
    email: string,
    role: Role,
    type: PrincipalType,
    secret: string,
    expiresIn: string
): string => {
    const payload: ITokenPayload = { sub: id, email, role, type };
    return jwt.sign(payload, secret, buildOptions(expiresIn));
};

export const signUserAccessToken = (user: IUser): string =>
    sign(
        user._id.toString(),
        user.email,
        (user.role as Role) || "admin",
        "user",
        getAccessSecret(),
        ACCESS_EXPIRES_IN
    );

export const signUserRefreshToken = (user: IUser): string =>
    sign(
        user._id.toString(),
        user.email,
        (user.role as Role) || "admin",
        "user",
        getRefreshSecret(),
        REFRESH_EXPIRES_IN
    );

export const signCustomerAccessToken = (customer: ICustomer): string =>
    sign(
        customer._id.toString(),
        customer.email,
        "customer",
        "customer",
        getAccessSecret(),
        ACCESS_EXPIRES_IN
    );

export const signCustomerRefreshToken = (customer: ICustomer): string =>
    sign(
        customer._id.toString(),
        customer.email,
        "customer",
        "customer",
        getRefreshSecret(),
        REFRESH_EXPIRES_IN
    );

const verifyToken = (token: string, secret: string): ITokenPayload => {
    const decoded = jwt.verify(token, secret) as ITokenPayload;
    if (!decoded.type || !decoded.role) {
        throw new jwt.JsonWebTokenError("Token missing type/role claim");
    }
    return decoded;
};

export const verifyUserAccessToken = (token: string): ITokenPayload =>
    verifyToken(token, getAccessSecret());

export const verifyUserRefreshToken = (token: string): ITokenPayload =>
    verifyToken(token, getRefreshSecret());

export const verifyCustomerAccessToken = (token: string): ITokenPayload =>
    verifyToken(token, getAccessSecret());

export const verifyCustomerRefreshToken = (token: string): ITokenPayload =>
    verifyToken(token, getRefreshSecret());

export interface AuthResponseData {
    user: Record<string, unknown>;
    accessToken: string;
    refreshToken: string;
}

export const buildAuthResponse = (
    user: Record<string, unknown>,
    accessToken: string,
    refreshToken: string,
    message = "Authentication successful"
) => ({
    success: true,
    message,
    data: {
        user,
        accessToken,
        refreshToken,
    },
});
