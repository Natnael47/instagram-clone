import { Router } from "express";
import authRoutes from "./auth.routes";
// import postRoutes from "./post.routes";
// import userRoutes from "./user.routes";
// import feedRoutes from "./feed.routes";
// import storyRoutes from "./story.routes";
// import commentRoutes from "./comment.routes";
// import messageRoutes from "./message.routes";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
// router.use("/posts", postRoutes);
// router.use("/users", userRoutes);
// router.use("/feed", feedRoutes);
// router.use("/stories", storyRoutes);
// router.use("/comments", commentRoutes);
// router.use("/messages", messageRoutes);

export default router;