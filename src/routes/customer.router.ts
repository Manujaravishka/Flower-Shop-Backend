import { Router } from "express";
import {
    addToCart,
    changeCustomerPassword,
    createCustomer,
    deleteCustomer,
    getAllCustomers,
    getAllCustomersPaged,
    getCustomer,
    qtyChange,
    removeFromCart,
    requestCode,
    updateCustomer,
    verifyLoginOTP,
    handleCustomerRefreshToken,
    customerLogout,
} from "../controller/customer.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin, requireRole } from "../middleware/requireRole";
import {
    validateEmail,
    validatePhoneLK,
    validateAddress,
    validateStrongPassword,
    validateNewPassword,
} from "../middleware/validations";
import { otpRateLimit } from "../middleware/rateLimit";

const router = Router();

router.post("/create", validateEmail, validatePhoneLK, createCustomer);
router.post("/request-code", otpRateLimit, requestCode);
router.post("/verify-code", otpRateLimit, verifyLoginOTP);
router.post("/refresh-token", handleCustomerRefreshToken);
router.post("/logout", customerLogout);

router.post("/add-to-cart", authenticate, requireRole("customer"), addToCart);
router.delete("/remove-from-cart", authenticate, requireRole("customer"), removeFromCart);
router.post("/change-qty", authenticate, requireRole("customer"), qtyChange);

router.put(
    "/update",
    authenticate,
    validateEmail,
    validatePhoneLK,
    validateAddress,
    updateCustomer
);
router.post("/get", authenticate, getCustomer);
router.get("/all", authenticate, requireAdmin, getAllCustomers);
router.get("/getAll", authenticate, requireAdmin, getAllCustomersPaged);
router.get("/:customerId", authenticate, getCustomer);
router.delete("/delete", authenticate, requireRole("admin", "superadmin"), deleteCustomer);
router.delete("/:customerId", authenticate, requireRole("admin", "superadmin"), deleteCustomer);

router.post(
    "/change-password",
    authenticate,
    requireRole("customer"),
    validateStrongPassword,
    validateNewPassword,
    changeCustomerPassword
);

export default router;
