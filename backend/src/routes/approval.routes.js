import { Router } from "express";
import { verifyJWT, verifyAdmin, verifySuperAdmin } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rateLimit.middleware.js";
import {
    requestApproval,
    listApprovals,
    approveApproval,
    denyApproval
} from "../controllers/approval.controller.js";

const router = Router();

router.use(verifyJWT, verifyAdmin);

router.route("/").post(requestApproval).get(listApprovals);

// শুধু Super Admin
router
    .route("/:id/approve")
    .patch(
        verifySuperAdmin,
        rateLimit({ name: "approve", windowMs: 15 * 60 * 1000, max: 10, key: req => String(req.user._id) }),
        approveApproval
    );
router.route("/:id/deny").patch(verifySuperAdmin, denyApproval);

export default router;
