import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPredictionSchema } from "@shared/schema";
import { z } from "zod";

const ADMIN_TELEGRAM_IDS = ["demo_user_123"];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const { telegramId, username, firstName, lastName, photoUrl } = req.body;

      if (!telegramId) {
        return res.status(400).json({ error: "telegramId is required" });
      }

      let user = await storage.getUserByTelegramId(telegramId);

      const isAdmin = ADMIN_TELEGRAM_IDS.includes(telegramId);

      if (!user) {
        user = await storage.createUser({
          telegramId,
          username: username || null,
          firstName: firstName || null,
          lastName: lastName || null,
          photoUrl: photoUrl || null,
          points: 5,
          isAdmin,
          lastLoginDate: new Date(),
          loginStreak: 1,
        });

        await storage.addPointsHistory({
          userId: user.id,
          action: "daily_login",
          amount: 5,
          description: "Бонус за первый вход",
        });
      } else {
        const now = new Date();
        const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
        const isNewDay = !lastLogin || 
          now.toDateString() !== lastLogin.toDateString();

        if (isNewDay) {
          const isConsecutiveDay = lastLogin && 
            (now.getTime() - lastLogin.getTime()) < 48 * 60 * 60 * 1000;
          
          const newStreak = isConsecutiveDay ? (user.loginStreak || 0) + 1 : 1;
          let bonusPoints = 5;

          if (newStreak % 7 === 0) {
            bonusPoints += 10;
            await storage.addPointsHistory({
              userId: user.id,
              action: "streak_bonus",
              amount: 10,
              description: `Бонус за ${newStreak} дней подряд`,
            });
          }

          await storage.updateUser(user.id, {
            lastLoginDate: now,
            loginStreak: newStreak,
            isAdmin: isAdmin || user.isAdmin,
          });

          await storage.updateUserPoints(user.id, 5);
          await storage.addPointsHistory({
            userId: user.id,
            action: "daily_login",
            amount: 5,
            description: "Ежедневный вход",
          });

          user = await storage.getUser(user.id);
        }
      }

      res.json(user);
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/me", async (req, res) => {
    try {
      const telegramId = req.query.telegramId as string;
      if (!telegramId) {
        return res.status(400).json({ error: "telegramId is required" });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/predictions/:sport", async (req, res) => {
    try {
      const { sport } = req.params;
      if (sport !== "football" && sport !== "hockey") {
        return res.status(400).json({ error: "Invalid sport type" });
      }

      const predictions = await storage.getPredictions(sport);
      const activePredictions = predictions.filter(p => !p.isArchived && !p.isHidden);
      res.json(activePredictions);
    } catch (error) {
      console.error("Get predictions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/predictions/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      const telegramId = req.body.telegramId || req.query.telegramId as string;

      if (!telegramId) {
        return res.status(400).json({ error: "telegramId is required" });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const prediction = await storage.getPrediction(id);
      if (!prediction) {
        return res.status(404).json({ error: "Prediction not found" });
      }

      const hasViewed = await storage.hasPredictionView(user.id, id);
      if (hasViewed) {
        return res.json({ points: 0, message: "Already viewed" });
      }

      await storage.addPredictionView({
        userId: user.id,
        predictionId: id,
      });

      await storage.updateUserPoints(user.id, 2);
      await storage.addPointsHistory({
        userId: user.id,
        action: "view_prediction",
        amount: 2,
        description: `Просмотр: ${prediction.homeTeam} — ${prediction.awayTeam}`,
        relatedPredictionId: id,
      });

      res.json({ points: 2, message: "Points awarded" });
    } catch (error) {
      console.error("View prediction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/points/history", async (req, res) => {
    try {
      const telegramId = req.query.telegramId as string;
      if (!telegramId) {
        return res.status(400).json({ error: "telegramId is required" });
      }

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const history = await storage.getPointsHistory(user.id);
      res.json(history);
    } catch (error) {
      console.error("Get points history error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const adminAuth = async (req: any, res: any, next: any) => {
    const telegramId = req.query.telegramId as string || req.body.telegramId;
    if (!telegramId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await storage.getUserByTelegramId(telegramId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.adminUser = user;
    next();
  };

  app.get("/api/admin/predictions", adminAuth, async (req, res) => {
    try {
      const predictions = await storage.getPredictions();
      res.json(predictions);
    } catch (error) {
      console.error("Admin get predictions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/predictions", adminAuth, async (req, res) => {
    try {
      const { telegramId, ...data } = req.body;

      const validatedData = insertPredictionSchema.parse({
        ...data,
        createdBy: (req as any).adminUser.id,
      });

      const prediction = await storage.createPrediction(validatedData);
      res.json(prediction);
    } catch (error) {
      console.error("Admin create prediction error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/admin/predictions/:id/result", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { result } = req.body;

      if (!["won", "lost", "cancelled"].includes(result)) {
        return res.status(400).json({ error: "Invalid result" });
      }

      const prediction = await storage.updatePredictionResult(id, result);
      if (!prediction) {
        return res.status(404).json({ error: "Prediction not found" });
      }

      res.json(prediction);
    } catch (error) {
      console.error("Admin update result error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/predictions/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePrediction(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin delete prediction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/stats", adminAuth, async (req, res) => {
    try {
      const predictionStats = await storage.getPredictionStats();
      const totalUsers = await storage.getUserCount();

      res.json({
        ...predictionStats,
        totalUsers,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
