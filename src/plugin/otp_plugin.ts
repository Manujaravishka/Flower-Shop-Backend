import { Schema } from "mongoose";
import crypto from "crypto";

export interface IOTPMethods {
    generateOTP(): Promise<string>;
    verifyOTP(code: string): Promise<boolean>;
}

export const otpPlugin = (schema: Schema) => {
    schema.add({
        verificationCode: {
            type: String,
            select: false,
        },
        verificationCodeExpires: {
            type: Date,
            select: false,
        },
    });

    schema.methods.generateOTP = async function () {
        const code = crypto.randomInt(100000, 999999).toString();

        this.verificationCode = code;
        this.verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);

        await this.save();
        return code;
    };

    schema.methods.verifyOTP = async function (inputCode: string) {
        if (!this.verificationCode || this.verificationCode !== inputCode) {
            return false;
        }

        if (!this.verificationCodeExpires || this.verificationCodeExpires < new Date()) {
            return false;
        }

        this.verificationCode = undefined;
        this.verificationCodeExpires = undefined;
        await this.save();

        return true;
    };
};
