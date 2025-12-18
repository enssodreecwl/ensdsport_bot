import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPredictionSchema } from "@shared/schema";
import { z } from "zod";
import { validateTelegramInitData, getTelegramUserIdFromInitData } from "./telegram-auth";

// Admin Telegram IDs - add your Telegram ID here
const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(",") || [];

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      telegramUserId?: string;
      user?: any;
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Middleware to validate Telegram init data and extract user ID
  const telegramAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const initData = req.headers["x-telegram-init-data"] as string;
    
    if (initData) {
      const telegramUserId = getTelegramUserIdFromInitData(initData);
      if (telegramUserId) {
        req.telegramUserId = telegramUserId;
      }
    }
    
    next();
  };

  // Apply Telegram auth middleware to all routes
  app.use(telegramAuthMiddleware);

  // Initialize user - requires validated Telegram init data
  app.post("/api/user/init", async (req, res) => {
    try {
      // SECURITY: Only use validated telegramUserId from middleware - never trust body
      const telegramId = req.telegramUserId;
      const { username, firstName, lastName } = req.body;
      
      if (!telegramId) {
        return res.status(400).json({ error: "Telegram ID required" });
      }

      let user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        const isAdmin = ADMIN_TELEGRAM_IDS.includes(telegramId);
        user = await storage.createUser({
          telegramId,
          username,
          firstName,
          lastName,
          isAdmin,
        });
      } else {
        // Update user info if changed
        user = await storage.updateUser(user.id, {
          username,
          firstName,
          lastName,
        }) || user;
      }

      res.json(user);
    } catch (error) {
      console.error("Error initializing user:", error);
      res.status(500).json({ error: "Failed to initialize user" });
    }
  });

  // Get current user - requires validated Telegram auth
  app.get("/api/user", async (req, res) => {
    try {
      const telegramId = req.telegramUserId;
      if (!telegramId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Get user stats - requires validated Telegram auth
  app.get("/api/user/stats", async (req, res) => {
    try {
      const telegramId = req.telegramUserId;
      if (!telegramId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const stats = await storage.getUserStats(user.id);
      res.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Claim daily bonus - requires validated Telegram auth
  app.post("/api/user/claim-bonus", async (req, res) => {
    try {
      const telegramId = req.telegramUserId;
      if (!telegramId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const result = await storage.claimDailyBonus(user.id);
      res.json(result);
    } catch (error: any) {
      console.error("Error claiming bonus:", error);
      if (error.message === "Daily bonus already claimed") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to claim bonus" });
    }
  });

  // Get predictions (public - no auth required)
  app.get("/api/predictions", async (req, res) => {
    try {
      const predictions = await storage.getPublicPredictions();
      res.json(predictions);
    } catch (error) {
      console.error("Error getting predictions:", error);
      res.status(500).json({ error: "Failed to get predictions" });
    }
  });

  // Create VIP invoice - requires validated Telegram auth
  app.post("/api/vip/create-invoice", async (req, res) => {
    try {
      const telegramId = req.telegramUserId;
      if (!telegramId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create transaction record
      const transaction = await storage.createTransaction({
        userId: user.id,
        amount: 100, // 100 Telegram Stars
        type: "vip_subscription",
        status: "pending",
      });

      // In a real implementation, you would create a Telegram invoice here
      // For now, return a placeholder
      res.json({ 
        transactionId: transaction.id,
        invoiceUrl: `tg://invoice?slug=vip_${transaction.id}`,
      });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // Admin middleware - requires validated Telegram auth AND admin status from DB
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const telegramId = req.telegramUserId;
    if (!telegramId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    if (!user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = user;
    next();
  };

  // Admin: Get all predictions
  app.get("/api/admin/predictions", requireAdmin, async (req, res) => {
    try {
      const predictions = await storage.getAllPredictions();
      res.json(predictions);
    } catch (error) {
      console.error("Error getting admin predictions:", error);
      res.status(500).json({ error: "Failed to get predictions" });
    }
  });

  // Admin: Create prediction
  app.post("/api/admin/predictions", requireAdmin, async (req: any, res) => {
    try {
      const validatedData = insertPredictionSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });

      const prediction = await storage.createPrediction(validatedData);
      res.json(prediction);
    } catch (error) {
      console.error("Error creating prediction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create prediction" });
    }
  });

  // Admin: Update prediction
  app.patch("/api/admin/predictions/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const prediction = await storage.updatePrediction(id, req.body);
      
      if (!prediction) {
        return res.status(404).json({ error: "Prediction not found" });
      }

      res.json(prediction);
    } catch (error) {
      console.error("Error updating prediction:", error);
      res.status(500).json({ error: "Failed to update prediction" });
    }
  });

  // Admin: Update prediction status
  app.patch("/api/admin/predictions/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, result } = req.body;

      const prediction = await storage.updatePrediction(id, { status, result });
      
      if (!prediction) {
        return res.status(404).json({ error: "Prediction not found" });
      }

      res.json(prediction);
    } catch (error) {
      console.error("Error updating prediction status:", error);
      res.status(500).json({ error: "Failed to update prediction status" });
    }
  });

  // Admin: Delete prediction
  app.delete("/api/admin/predictions/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePrediction(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting prediction:", error);
      res.status(500).json({ error: "Failed to delete prediction" });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  return httpServer;
}
