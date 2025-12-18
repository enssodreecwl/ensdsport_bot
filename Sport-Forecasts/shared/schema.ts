import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sport types enum
export const SPORT_TYPES = ['football', 'hockey', 'mma', 'ufc', 'boxing', 'other'] as const;
export type SportType = typeof SPORT_TYPES[number];

// Prediction status enum
export const PREDICTION_STATUS = ['pending', 'won', 'lost', 'cancelled'] as const;
export type PredictionStatus = typeof PREDICTION_STATUS[number];

// Users table - stores Telegram users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: varchar("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isVip: boolean("is_vip").default(false).notNull(),
  vipExpiresAt: timestamp("vip_expires_at"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  points: integer("points").default(0).notNull(),
  streak: integer("streak").default(0).notNull(),
  lastDailyBonus: timestamp("last_daily_bonus"),
  totalPredictionsViewed: integer("total_predictions_viewed").default(0).notNull(),
  activeDays: integer("active_days").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Predictions table - stores sports predictions
export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sport: text("sport").notNull().$type<SportType>(),
  team1: text("team1").notNull(),
  team2: text("team2").notNull(),
  prediction: text("prediction").notNull(),
  analysis: text("analysis"),
  odds: real("odds"),
  confidence: integer("confidence"), // 1-100
  isVip: boolean("is_vip").default(false).notNull(),
  status: text("status").default('pending').notNull().$type<PredictionStatus>(),
  matchTime: timestamp("match_time").notNull(),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Transactions table - stores VIP purchases via Telegram Stars
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  telegramPaymentChargeId: text("telegram_payment_charge_id"),
  amount: integer("amount").notNull(), // in Telegram Stars
  type: text("type").notNull(), // 'vip_subscription'
  status: text("status").default('pending').notNull(), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Point transactions - tracks point earnings
export const pointTransactions = pgTable("point_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(), // 'daily_bonus', 'streak_bonus', 'view_prediction', 'referral'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  predictions: many(predictions),
  transactions: many(transactions),
  pointTransactions: many(pointTransactions),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  creator: one(users, {
    fields: [predictions.createdBy],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const pointTransactionsRelations = relations(pointTransactions, ({ one }) => ({
  user: one(users, {
    fields: [pointTransactions.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;
export type PointTransaction = typeof pointTransactions.$inferSelect;

// Frontend types
export interface UserStats {
  points: number;
  streak: number;
  level: number;
  totalPredictionsViewed: number;
  activeDays: number;
  isVip: boolean;
  vipExpiresAt: string | null;
  canClaimDailyBonus: boolean;
}

export interface DailyBonusResult {
  points: number;
  newStreak: number;
  bonusMultiplier: number;
}
