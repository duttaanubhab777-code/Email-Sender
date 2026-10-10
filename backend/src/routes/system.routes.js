import { Router } from "express";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getPublicStatus } from "../services/killSwitch.service.js";

const router = Router();

// Public: frontend এই route দেখে countdown দেখাবে (kill switch চালু থাকলেও এটা খোলা)
router.route("/status").get((req, res) =>
    res.status(200).json(new ApiResponse(200, getPublicStatus(), "System status"))
);

export default router;
