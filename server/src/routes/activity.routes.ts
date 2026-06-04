// src/routes/activity.routes.ts
import { ActivityController } from "@controllers/activity.controller";
import { protect } from "@middleware/auth.middleware";
import { Router } from "express";

const router = Router();

// All activity routes require authentication
router.use(protect);

// User's own activity
router.get("/my-activity", ActivityController.getMyActivity);

// Activity statistics
router.get("/stats", ActivityController.getActivityStats);

// Resource-specific activity
router.get("/resource/:type/:id", ActivityController.getResourceActivity);

// Recent activity (could be admin-only)
router.get("/recent", ActivityController.getRecentActivity);

export default router;
