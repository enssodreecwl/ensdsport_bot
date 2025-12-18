import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sportTypeEnum = pgEnum("sport_type", ["football", "hockey"]);
export const predictionResultEnum = pgEnum("prediction_result", ["pending", "won", "lost", "cancelled"]);
export const pointsActionEnum = pgEnum("points_action", ["daily_login", "view_prediction", "subscribe_channel", "invite_friend", "streak_bonus", "admin_bonus", "spend_vip", "spend_ai"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: varchar("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  photoUrl: text("photo_url"),
  points: integer("points").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  lastLoginDate: timestamp("last_login_date"),
  loginStreak: integer("login_streak").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sportType: sportTypeEnum("sport_type").notNull(),
  league: text("league").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  prediction: text("prediction").notNull(),
  coefficient: real("coefficient").notNull(),
  confidence: integer("confidence").notNull(),
  comment: text("comment"),
  result: predictionResultEnum("result").notNull().default("pending"),
  isArchived: boolean("is_archived").notNull().default(false),
  isHidden: boolean("is_hidden").notNull().default(false),
  matchDate: timestamp("match_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

export const pointsHistory = pgTable("points_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: pointsActionEnum("action").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  relatedPredictionId: varchar("related_prediction_id").references(() => predictions.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const predictionViews = pgTable("prediction_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  predictionId: varchar("prediction_id").notNull().references(() => predictions.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  pointsHistory: many(pointsHistory),
  predictionViews: many(predictionViews),
  createdPredictions: many(predictions),
}));

export const predictionsRelations = relations(predictions, ({ one, many }) => ({
  creator: one(users, {
    fields: [predictions.createdBy],
    references: [users.id],
  }),
  views: many(predictionViews),
  pointsHistory: many(pointsHistory),
}));

export const pointsHistoryRelations = relations(pointsHistory, ({ one }) => ({
  user: one(users, {
    fields: [pointsHistory.userId],
    references: [users.id],
  }),
  prediction: one(predictions, {
    fields: [pointsHistory.relatedPredictionId],
    references: [predictions.id],
  }),
}));

export const predictionViewsRelations = relations(predictionViews, ({ one }) => ({
  user: one(users, {
    fields: [predictionViews.userId],
    references: [users.id],
  }),
  prediction: one(predictions, {
    fields: [predictionViews.predictionId],
    references: [predictions.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  createdAt: true,
  isArchived: true,
  result: true,
});

export const insertPointsHistorySchema = createInsertSchema(pointsHistory).omit({
  id: true,
  createdAt: true,
});

export const insertPredictionViewSchema = createInsertSchema(predictionViews).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type PointsHistory = typeof pointsHistory.$inferSelect;

export type InsertPredictionView = z.infer<typeof insertPredictionViewSchema>;
export type PredictionView = typeof predictionViews.$inferSelect;

export type SportType = "football" | "hockey";
export type PredictionResult = "pending" | "won" | "lost" | "cancelled";
export type PointsAction = "daily_login" | "view_prediction" | "subscribe_channel" | "invite_friend" | "streak_bonus" | "admin_bonus" | "spend_vip" | "spend_ai";
