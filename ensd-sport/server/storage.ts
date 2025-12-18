import {
  type User,
  type InsertUser,
  type Prediction,
  type InsertPrediction,
  type PointsHistory,
  type InsertPointsHistory,
  type PredictionView,
  type InsertPredictionView,
  users,
  predictions,
  pointsHistory,
  predictionViews,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPoints(id: string, amount: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;

  getPredictions(sportType?: string): Promise<Prediction[]>;
  getPrediction(id: string): Promise<Prediction | undefined>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  updatePrediction(id: string, data: Partial<InsertPrediction>): Promise<Prediction | undefined>;
  deletePrediction(id: string): Promise<boolean>;
  updatePredictionResult(id: string, result: "won" | "lost" | "cancelled"): Promise<Prediction | undefined>;
  getPredictionStats(): Promise<{
    totalPredictions: number;
    wonPredictions: number;
    lostPredictions: number;
    pendingPredictions: number;
  }>;

  getPointsHistory(userId: string): Promise<PointsHistory[]>;
  addPointsHistory(history: InsertPointsHistory): Promise<PointsHistory>;

  hasPredictionView(userId: string, predictionId: string): Promise<boolean>;
  addPredictionView(view: InsertPredictionView): Promise<PredictionView>;
}

export class DatabaseStorage implements IStorage {
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

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async updateUserPoints(id: string, amount: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ points: sql`${users.points} + ${amount}` })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0]?.count || 0;
  }

  async getPredictions(sportType?: string): Promise<Prediction[]> {
    if (sportType) {
      return db
        .select()
        .from(predictions)
        .where(eq(predictions.sportType, sportType as "football" | "hockey"))
        .orderBy(desc(predictions.createdAt));
    }
    return db.select().from(predictions).orderBy(desc(predictions.createdAt));
  }

  async getPrediction(id: string): Promise<Prediction | undefined> {
    const [prediction] = await db.select().from(predictions).where(eq(predictions.id, id));
    return prediction || undefined;
  }

  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    const [prediction] = await db.insert(predictions).values(insertPrediction).returning();
    return prediction;
  }

  async updatePrediction(id: string, data: Partial<InsertPrediction>): Promise<Prediction | undefined> {
    const [prediction] = await db
      .update(predictions)
      .set(data)
      .where(eq(predictions.id, id))
      .returning();
    return prediction || undefined;
  }

  async deletePrediction(id: string): Promise<boolean> {
    const result = await db.delete(predictions).where(eq(predictions.id, id));
    return true;
  }

  async updatePredictionResult(
    id: string,
    result: "won" | "lost" | "cancelled"
  ): Promise<Prediction | undefined> {
    const [prediction] = await db
      .update(predictions)
      .set({ result, isArchived: true })
      .where(eq(predictions.id, id))
      .returning();
    return prediction || undefined;
  }

  async getPredictionStats(): Promise<{
    totalPredictions: number;
    wonPredictions: number;
    lostPredictions: number;
    pendingPredictions: number;
  }> {
    const allPredictions = await db.select().from(predictions);
    return {
      totalPredictions: allPredictions.length,
      wonPredictions: allPredictions.filter((p) => p.result === "won").length,
      lostPredictions: allPredictions.filter((p) => p.result === "lost").length,
      pendingPredictions: allPredictions.filter((p) => p.result === "pending").length,
    };
  }

  async getPointsHistory(userId: string): Promise<PointsHistory[]> {
    return db
      .select()
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId))
      .orderBy(desc(pointsHistory.createdAt));
  }

  async addPointsHistory(history: InsertPointsHistory): Promise<PointsHistory> {
    const [record] = await db.insert(pointsHistory).values(history).returning();
    return record;
  }

  async hasPredictionView(userId: string, predictionId: string): Promise<boolean> {
    const [view] = await db
      .select()
      .from(predictionViews)
      .where(
        and(eq(predictionViews.userId, userId), eq(predictionViews.predictionId, predictionId))
      );
    return !!view;
  }

  async addPredictionView(view: InsertPredictionView): Promise<PredictionView> {
    const [record] = await db.insert(predictionViews).values(view).returning();
    return record;
  }
}

export const storage = new DatabaseStorage();
