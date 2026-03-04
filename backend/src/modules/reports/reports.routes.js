import { Router } from "express";
import {
  getSummary,
  getDaily,
  getTopProducts,
  getInvestment
} from "./reports.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = Router();

// GET /reports/summary
router.get(
  "/summary",
  requireAuth,
  requireRole("admin", "administrador", "owner", "gerente", "superadmin"),
  getSummary
);

// GET /reports/daily
router.get(
  "/daily",
  requireAuth,
  requireRole("admin", "administrador", "owner", "gerente", "superadmin"),
  getDaily
);

// GET /reports/top-products
router.get(
  "/top-products",
  requireAuth,
  requireRole("admin", "administrador", "owner", "gerente", "superadmin"),
  getTopProducts
);

// GET /reports/investment
router.get(
  "/investment",
  requireAuth,
  requireRole("admin", "administrador", "owner", "gerente", "superadmin"),
  getInvestment
);

// Rutas públicas para empleados (sin reportes financieros)
router.get(
  "/dashboard-summary",
  requireAuth,
  async (req, res) => {
    // Resumen básico visible para todos (sin ganancias)
    res.json({ message: "Dashboard summary for all users" });
  }
);

export default router;
