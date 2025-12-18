import { 
  users, predictions, transactions, pointTransactions,
  type User, type InsertUser, 
  type Prediction, type InsertPrediction,
  type Transaction, type InsertTransaction,
  type PointTransaction, type InsertPointTransaction,
  type UserStats, type DailyBonusResult
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // User Stats
  getUserStats(userId: string): Promise<UserStats>;
  claimDailyBonus(userId: string): Promise<DailyBonusResult>;
  
  // Predictions
  getPrediction(id: string): Promise<Prediction | undefined>;
  getAllPredictions(): Promise<Prediction[]>;
  getPublicPredictions(): Promise<Prediction[]>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  updatePrediction(id: string, data: Partial<Prediction>): Promise<Prediction | undefined>;
  deletePrediction(id: string): Promise<void>;
  
  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Point Transactions
  addPoints(userId: string, amount: number, reason: string): Promise<PointTransaction>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // User Stats
  async getUserStats(userId: string): Promise<UserStats> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const lastBonus = user.lastDailyBonus ? new Date(user.lastDailyBonus) : null;
    
    let canClaimDailyBonus = true;
    if (lastBonus) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastBonusDay = new Date(lastBonus.getFullYear(), lastBonus.getMonth(), lastBonus.getDate());
      canClaimDailyBonus = today > lastBonusDay;
    }

    return {
      points: user.points,
      streak: user.streak,
      level: user.level,
      totalPredictionsViewed: user.totalPredictionsViewed,
      activeDays: user.activeDays,
      isVip: user.isVip,
      vipExpiresAt: user.vipExpiresAt?.toISOString() || null,
      canClaimDailyBonus,
    };
  }

  async claimDailyBonus(userId: string): Promise<DailyBonusResult> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const lastBonus = user.lastDailyBonus ? new Date(user.lastDailyBonus) : null;
    
    if (lastBonus) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastBonusDay = new Date(lastBonus.getFullYear(), lastBonus.getMonth(), lastBonus.getDate());
      if (today <= lastBonusDay) {
        throw new Error("Daily bonus already claimed");
      }
    }

    // Check if streak continues (claimed yesterday)
    let newStreak = 1;
    if (lastBonus) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const lastBonusDay = new Date(lastBonus.getFullYear(), lastBonus.getMonth(), lastBonus.getDate());
      
      if (lastBonusDay.getTime() === yesterdayStart.getTime()) {
        newStreak = Math.min(user.streak + 1, 7);
      }
    }

    const baseBonus = 10;
    const bonusMultiplier = newStreak;
    const points = baseBonus * bonusMultiplier;

    // Update user
    await this.updateUser(userId, {
      streak: newStreak,
      points: user.points + points,
      lastDailyBonus: now,
      activeDays: user.activeDays + 1,
      level: Math.floor((user.points + points) / 1000) + 1,
    });

    // Record point transaction
    await this.addPoints(userId, points, "daily_bonus");

    return {
      points,
      newStreak,
      bonusMultiplier,
    };
  }

  // Predictions
  async getPrediction(id: string): Promise<Prediction | undefined> {
    const [prediction] = await db.select().from(predictions).where(eq(predictions.id, id));
    return prediction || undefined;
  }

  async getAllPredictions(): Promise<Prediction[]> {
    return db.select().from(predictions).orderBy(desc(predictions.createdAt));
  }

  async getPublicPredictions(): Promise<Prediction[]> {
    return db.select().from(predictions).orderBy(desc(predictions.matchTime));
  }

  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    const [prediction] = await db.insert(predictions).values(insertPrediction).returning();
    return prediction;
  }

  async updatePrediction(id: string, data: Partial<Prediction>): Promise<Prediction | undefined> {
    const [prediction] = await db.update(predictions).set(data).where(eq(predictions.id, id)).returning();
    return prediction || undefined;
  }

  async deletePrediction(id: string): Promise<void> {
    await db.delete(predictions).where(eq(predictions.id, id));
  }

  // Transactions
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db.update(transactions).set(data).where(eq(transactions.id, id)).returning();
    return transaction || undefined;
  }

  // Point Transactions
  async addPoints(userId: string, amount: number, reason: string): Promise<PointTransaction> {
    const [pointTransaction] = await db.insert(pointTransactions).values({
      userId,
      amount,
      reason,
    }).returning();
    return pointTransaction;
  }
}

export const storage = new DatabaseStorage();
