import { relations } from "drizzle-orm";
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ============================================================================
// USER TABLE (existing, extended)
// ============================================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// COMPANIES - Player's business entity
// ============================================================================
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  logo: varchar("logo", { length: 512 }),
  description: text("description"),
  cash: decimal("cash", { precision: 20, scale: 2 }).default("1000000.00").notNull(),
  reputation: int("reputation").default(50).notNull(),
  founded: timestamp("founded").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// ============================================================================
// RESOURCE TYPES - Definition of all resources in the game
// ============================================================================
export const resourceTypes = mysqlTable("resource_types", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  category: mysqlEnum("category", [
    "raw_material",
    "intermediate",
    "finished_good",
    "equipment",
    "consumable",
  ]).notNull(),
  basePrice: decimal("basePrice", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 32 }).default("units").notNull(),
  icon: varchar("icon", { length: 128 }),
  description: text("description"),
});

export type ResourceType = typeof resourceTypes.$inferSelect;
export type InsertResourceType = typeof resourceTypes.$inferInsert;

// ============================================================================
// BUSINESS UNITS - Factories, stores, mines, farms, labs, offices
// ============================================================================
export const businessUnits = mysqlTable("business_units", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  type: mysqlEnum("type", [
    "office",
    "store",
    "factory",
    "mine",
    "farm",
    "laboratory",
  ]).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  cityId: int("cityId").notNull(),
  level: int("level").default(1).notNull(),
  size: int("size").default(100).notNull(), // Square meters or capacity
  condition: int("condition").default(100).notNull(), // 0-100%
  efficiency: decimal("efficiency", { precision: 5, scale: 2 }).default("1.00").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessUnit = typeof businessUnits.$inferSelect;
export type InsertBusinessUnit = typeof businessUnits.$inferInsert;

// ============================================================================
// CITIES - Locations where business units can be placed
// ============================================================================
export const cities = mysqlTable("cities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  country: varchar("country", { length: 64 }).notNull(),
  population: int("population").notNull(),
  wealthIndex: decimal("wealthIndex", { precision: 5, scale: 2 }).default("1.00").notNull(),
  taxRate: decimal("taxRate", { precision: 5, scale: 4 }).default("0.2000").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
});

export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;

// ============================================================================
// EMPLOYEES - Workers at business units
// ============================================================================
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  businessUnitId: int("businessUnitId").notNull(),
  count: int("count").default(0).notNull(),
  qualification: decimal("qualification", { precision: 5, scale: 2 }).default("1.00").notNull(),
  salary: decimal("salary", { precision: 12, scale: 2 }).default("1000.00").notNull(),
  morale: int("morale").default(70).notNull(), // 0-100
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ============================================================================
// INVENTORY - Resources stored at business units
// ============================================================================
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  businessUnitId: int("businessUnitId").notNull(),
  resourceTypeId: int("resourceTypeId").notNull(),
  quantity: decimal("quantity", { precision: 20, scale: 4 }).default("0").notNull(),
  quality: decimal("quality", { precision: 5, scale: 2 }).default("1.00").notNull(),
  averageCost: decimal("averageCost", { precision: 12, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

// ============================================================================
// PRODUCTION RECIPES - What factories/farms can produce
// ============================================================================
export const productionRecipes = mysqlTable("production_recipes", {
  id: int("id").autoincrement().primaryKey(),
  unitType: mysqlEnum("unitType", ["factory", "farm", "mine", "laboratory"]).notNull(),
  outputResourceId: int("outputResourceId").notNull(),
  outputQuantity: decimal("outputQuantity", { precision: 12, scale: 4 }).default("1").notNull(),
  inputResources: json("inputResources").$type<{ resourceId: number; quantity: number }[]>(),
  laborRequired: int("laborRequired").default(1).notNull(),
  timeRequired: int("timeRequired").default(1).notNull(), // In game turns
  technologyRequired: int("technologyRequired").default(0),
  description: text("description"),
});

export type ProductionRecipe = typeof productionRecipes.$inferSelect;
export type InsertProductionRecipe = typeof productionRecipes.$inferInsert;

// ============================================================================
// PRODUCTION QUEUE - Active production at units
// ============================================================================
export const productionQueue = mysqlTable("production_queue", {
  id: int("id").autoincrement().primaryKey(),
  businessUnitId: int("businessUnitId").notNull(),
  recipeId: int("recipeId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductionQueue = typeof productionQueue.$inferSelect;
export type InsertProductionQueue = typeof productionQueue.$inferInsert;

// ============================================================================
// MARKET LISTINGS - Items for sale on the market
// ============================================================================
export const marketListings = mysqlTable("market_listings", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  businessUnitId: int("businessUnitId").notNull(),
  resourceTypeId: int("resourceTypeId").notNull(),
  quantity: decimal("quantity", { precision: 20, scale: 4 }).notNull(),
  quality: decimal("quality", { precision: 5, scale: 2 }).default("1.00").notNull(),
  pricePerUnit: decimal("pricePerUnit", { precision: 12, scale: 2 }).notNull(),
  cityId: int("cityId").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type MarketListing = typeof marketListings.$inferSelect;
export type InsertMarketListing = typeof marketListings.$inferInsert;

// ============================================================================
// TRANSACTIONS - Purchase/sale history
// ============================================================================
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", [
    "purchase",
    "sale",
    "salary",
    "tax",
    "construction",
    "maintenance",
    "other",
  ]).notNull(),
  companyId: int("companyId").notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  description: text("description"),
  relatedUnitId: int("relatedUnitId"),
  relatedResourceId: int("relatedResourceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ============================================================================
// TECHNOLOGIES - Research tree
// ============================================================================
export const technologies = mysqlTable("technologies", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  category: mysqlEnum("category", [
    "production",
    "commerce",
    "management",
    "science",
  ]).notNull(),
  description: text("description"),
  researchCost: int("researchCost").notNull(),
  prerequisites: json("prerequisites").$type<number[]>(),
  effects: json("effects").$type<{ type: string; value: number }[]>(),
});

export type Technology = typeof technologies.$inferSelect;
export type InsertTechnology = typeof technologies.$inferInsert;

// ============================================================================
// COMPANY TECHNOLOGIES - Technologies researched by companies
// ============================================================================
export const companyTechnologies = mysqlTable("company_technologies", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  technologyId: int("technologyId").notNull(),
  researchProgress: int("researchProgress").default(0).notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
});

export type CompanyTechnology = typeof companyTechnologies.$inferSelect;
export type InsertCompanyTechnology = typeof companyTechnologies.$inferInsert;

// ============================================================================
// GAME STATE - Global game settings and turn info
// ============================================================================
export const gameState = mysqlTable("game_state", {
  id: int("id").autoincrement().primaryKey(),
  currentTurn: int("currentTurn").default(1).notNull(),
  turnDuration: int("turnDuration").default(3600).notNull(), // Seconds
  lastTurnProcessed: timestamp("lastTurnProcessed"),
  settings: json("settings").$type<Record<string, unknown>>(),
});

export type GameState = typeof gameState.$inferSelect;
export type InsertGameState = typeof gameState.$inferInsert;

// ============================================================================
// NOTIFICATIONS - Player notifications
// ============================================================================
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "info",
    "success",
    "warning",
    "error",
    "trade",
    "production",
  ]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  companies: many(companies),
  notifications: many(notifications),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(users, {
    fields: [companies.userId],
    references: [users.id],
  }),
  businessUnits: many(businessUnits),
  marketListings: many(marketListings),
  transactions: many(transactions),
  technologies: many(companyTechnologies),
}));

export const businessUnitsRelations = relations(businessUnits, ({ one, many }) => ({
  company: one(companies, {
    fields: [businessUnits.companyId],
    references: [companies.id],
  }),
  city: one(cities, {
    fields: [businessUnits.cityId],
    references: [cities.id],
  }),
  employees: one(employees),
  inventory: many(inventory),
  productionQueue: many(productionQueue),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  businessUnit: one(businessUnits, {
    fields: [inventory.businessUnitId],
    references: [businessUnits.id],
  }),
  resourceType: one(resourceTypes, {
    fields: [inventory.resourceTypeId],
    references: [resourceTypes.id],
  }),
}));
