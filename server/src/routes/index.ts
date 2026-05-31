import { Router } from "express";
import authRoutes from "./auth.routes";
import commentRoutes from "./comment.routes";
import feedRoutes from "./feed.routes";
import messageRoutes from "./message.routes";
import notificationRoutes from "./notification.routes";
import postRoutes from "./post.routes";
import storyRoutes from "./story.routes";
import userRoutes from "./user.routes";

const router = Router();

// Mount all routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/posts", postRoutes);
router.use("/feed", feedRoutes);
router.use("/stories", storyRoutes);
router.use("/comments", commentRoutes);
router.use("/messages", messageRoutes);
router.use("/notifications", notificationRoutes);

// Health check is already in app.ts

export default router;
