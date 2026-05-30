import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    message: "Instagram Clone API",
    version: "1.0.0",
    status: "active",
  });
});

export default router;
