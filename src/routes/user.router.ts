import { Router } from "express";
import {
    validateName,
    validateEmail,
    validatePhoneLK,
    validateStrongPassword,
    validateLoginPayload,
    validateNewPassword,
} from "../middleware/validations";
import {
    registerUser,
    registerAdmin,
    login,
    UpdateUser,
    getData,
    changePassword,
    requestCode,
    forgetPasswordVerifyCode,
    setNewPassword,
    handleRefreshToken,
    logout,
} from "../controller/user.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { authRateLimit, otpRateLimit } from "../middleware/rateLimit";

const userRouter = Router();

userRouter.post(
    "/register",
    authRateLimit,
    validateName,
    validateEmail,
    validatePhoneLK,
    validateStrongPassword,
    registerUser
);

userRouter.post("/login", authRateLimit, validateLoginPayload, login);

userRouter.put(
    "/update",
    authenticate,
    validateName,
    validateEmail,
    validatePhoneLK,
    UpdateUser
);

userRouter.get("/me", authenticate, getData);

userRouter.post(
    "/change-password",
    authenticate,
    validateStrongPassword,
    validateNewPassword,
    changePassword
);

userRouter.post("/forgot-password/request-code", otpRateLimit, requestCode);
userRouter.post("/forgot-password/verify-code", otpRateLimit, forgetPasswordVerifyCode);
userRouter.post("/forgot-password/reset", validateNewPassword, setNewPassword);

userRouter.post("/send-otp", otpRateLimit, requestCode);
userRouter.post("/verify-otp", otpRateLimit, forgetPasswordVerifyCode);

userRouter.post("/refresh-token", handleRefreshToken);
userRouter.post("/logout", logout);

userRouter.post(
    "/register-admin",
    authenticate,
    requireRole("superadmin"),
    validateName,
    validateEmail,
    validatePhoneLK,
    validateStrongPassword,
    registerAdmin
);

export default userRouter;

