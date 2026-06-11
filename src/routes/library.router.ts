import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireRole";
import { upload, verifyUploadedFiles } from "../middleware/upload";
import {
    createLibrary,
    deleteImageFromLibrary,
    deleteLibrary,
    findByName,
    getAllLibraries,
    getLibraries,
    updateImagesToLibrary,
    updateTitle,
} from "../controller/library.controller";
import { validateObjectIdParam } from "../middleware/validations";

const router = Router();

router.post(
    "/create",
    authenticate,
    requireAdmin,
    upload.array("image", 5),
    verifyUploadedFiles,
    createLibrary
);
router.get("/all", getAllLibraries);
router.get("/getAll", getAllLibraries);
router.delete("/:id", authenticate, requireAdmin, deleteLibrary);
router.get("/:id", validateObjectIdParam("id"), getLibraries);
router.put("/:id", authenticate, requireAdmin, updateTitle);
router.delete("/:id/image", authenticate, requireAdmin, deleteImageFromLibrary);
router.put(
    "/:id/images",
    authenticate,
    requireAdmin,
    upload.array("image", 5),
    verifyUploadedFiles,
    updateImagesToLibrary
);
router.post("/find-by-name", authenticate, requireAdmin, findByName);

export default router;

