import { Router } from "express";
import { sendEmail } from "../controllers/submission.controller.js";
import { verifyApiKey } from "../middlewares/apiKey.middleware.js";

const router = Router();


router.route("/send").post(verifyApiKey, sendEmail);

export default router;