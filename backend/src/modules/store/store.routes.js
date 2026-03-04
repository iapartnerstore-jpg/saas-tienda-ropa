import express from "express";
import { getStoreSettings, updateStoreSettings } from "./store.controller.js";

const router = express.Router();

router.get("/settings", getStoreSettings);
router.post("/settings", updateStoreSettings);

export default router;
