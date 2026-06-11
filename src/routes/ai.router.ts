import { Router } from "express";
import { generateGiftImage } from "../controller/ai.controller";

const router = Router();

router.post("/generate", generateGiftImage);

export default router;
