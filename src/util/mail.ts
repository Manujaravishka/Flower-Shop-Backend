import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;

export const isMailConfigured = Boolean(smtpHost && smtpUser && smtpPass);

const transporter: Transporter = isMailConfigured
    ? nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
              user: smtpUser,
              pass: smtpPass,
          },
      })
    : nodemailer.createTransport({
          jsonTransport: true,
      });

export interface MailPayload {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

const baseLayout = (title: string, body: string): string => `
<!doctype html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="background: #f7f7f7; padding: 20px; border-radius: 8px;">
        ${body}
    </div>
    <p style="font-size: 12px; color: #888; margin-top: 20px;">&copy; Petal Dreams</p>
</body>
</html>`;

export const templates = {
    welcome: (name: string) => ({
        subject: "Welcome to Petal Dreams",
        html: baseLayout(
            "Welcome",
            `<h1>Hi ${name}</h1><p>Thanks for registering with Petal Dreams!</p>`
        ),
    }),
    passwordResetCode: (code: string) => ({
        subject: "Password reset code - Petal Dreams",
        html: baseLayout(
            "Password reset",
            `<h1>Password reset</h1>
             <p>Your password reset OTP is <b>${code}</b>. It expires in 5 minutes.</p>
             <p>If you did not request this, please ignore this email.</p>`
        ),
    }),
    customerOtp: (code: string) => ({
        subject: "Your Verification Code",
        text: `Your verification code is: ${code}. It will expire in 5 minutes.`,
        html: baseLayout(
            "Verification Code",
            `<h1>Verification Code</h1>
             <p>Your verification code is <b>${code}</b>. It will expire in 5 minutes.</p>`
        ),
    }),
    customerPasswordResetCode: (code: string) => ({
        subject: "Password reset code - Petal Dreams",
        html: baseLayout(
            "Password reset",
            `<h1>Password reset</h1>
             <p>Your password reset OTP is <b>${code}</b>. It expires in 5 minutes.</p>`
        ),
    }),
    orderStatusUpdate: (orderId: string, status: string) => ({
        subject: "Order Status Updated",
        html: baseLayout(
            "Order Update",
            `<h1>Order Update</h1>
             <p>Your order with ID: <strong>${orderId}</strong> has been updated to status: <strong>${status}</strong>.</p>`
        ),
    }),
    orderConfirmation: (orderId: string, total: number) => ({
        subject: "Order Confirmation",
        html: baseLayout(
            "Order Confirmation",
            `<h1>Order Confirmed</h1>
             <p>Thanks for your order!</p>
             <p>Order ID: <strong>${orderId}</strong></p>
             <p>Total: <strong>${total.toFixed(2)}</strong></p>`
        ),
    }),
};

export const sendEmail = async ({ to, subject, text, html }: MailPayload) => {
    if (!isMailConfigured) {
        console.warn("SMTP not configured; skipping email send:", { to, subject });
        return { messageId: "skipped" };
    }

    const mailOptions: SendMailOptions = {
        from: smtpFrom,
        to,
        subject,
        text,
        html,
    };

    return transporter.sendMail(mailOptions);
};
