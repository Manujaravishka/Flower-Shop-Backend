import { Router } from "express";
import {
    registerCustomer,
    loginCustomer,
} from "../controller/customer.controller";
import {
    validateName,
    validateEmail,
    validatePhoneLK,
    validateStrongPassword,
    validateLoginPayload,
} from "../middleware/validations";
import { authRateLimit } from "../middleware/rateLimit";

const customerAuthRouter = Router();

customerAuthRouter.post(
    "/register",
    authRateLimit,
    validateName,
    validateEmail,
    validatePhoneLK,
    validateStrongPassword,
    registerCustomer
);

customerAuthRouter.post("/login", authRateLimit, validateLoginPayload, loginCustomer);

export default customerAuthRouter;
