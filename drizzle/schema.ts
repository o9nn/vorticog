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

// ============================================================================
// AGENTIC SIMULATION ELEMENTS
// ============================================================================

// ============================================================================
// CHARACTER PERSONAS - Personality and behavioral templates
// ============================================================================
export const characterPersonas = mysqlTable("character_personas", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  // Motivational drivers (0-100 scale)
  ambitionLevel: int("ambitionLevel").default(50).notNull(), // Drive for success/growth
  cautionLevel: int("cautionLevel").default(50).notNull(), // Risk aversion
  socialLevel: int("socialLevel").default(50).notNull(), // Preference for collaboration
  analyticalLevel: int("analyticalLevel").default(50).notNull(), // Data-driven decision making
  // Communication style
  communicationStyle: mysqlEnum("communicationStyle", [
    "formal",
    "casual",
    "aggressive",
    "passive",
    "diplomatic",
  ]).default("formal").notNull(),
  // Decision-making tendencies
  decisionSpeed: mysqlEnum("decisionSpeed", [
    "impulsive",
    "quick",
    "moderate",
    "deliberate",
    "very_slow",
  ]).default("moderate").notNull(),
});

export type CharacterPersona = typeof characterPersonas.$inferSelect;
export type InsertCharacterPersona = typeof characterPersonas.$inferInsert;

// ============================================================================
// CHARACTER TRAITS - Individual characteristics
// ============================================================================
export const characterTraits = mysqlTable("character_traits", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  category: mysqlEnum("category", [
    "professional",
    "social",
    "cognitive",
    "emotional",
  ]).notNull(),
  description: text("description"),
  positiveEffect: boolean("positiveEffect").default(true).notNull(), // Is this generally beneficial?
});

export type CharacterTrait = typeof characterTraits.$inferSelect;
export type InsertCharacterTrait = typeof characterTraits.$inferInsert;

// ============================================================================
// AGENTS - Semi-autonomous simulation entities (customers, suppliers, employees, partners)
// ============================================================================
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", [
    "customer",
    "supplier",
    "employee",
    "partner",
    "investor",
    "competitor",
  ]).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  personaId: int("personaId").notNull(),
  // Company association (null for customers/external agents)
  companyId: int("companyId"),
  businessUnitId: int("businessUnitId"), // For employees
  cityId: int("cityId").notNull(),
  
  // Emotional state (0-100 scale)
  happiness: int("happiness").default(70).notNull(),
  satisfaction: int("satisfaction").default(70).notNull(),
  stress: int("stress").default(30).notNull(),
  loyalty: int("loyalty").default(50).notNull(),
  trust: int("trust").default(50).notNull(),
  
  // Needs (0-100 scale, higher = greater need)
  financialNeed: int("financialNeed").default(50).notNull(),
  securityNeed: int("securityNeed").default(50).notNull(),
  recognitionNeed: int("recognitionNeed").default(50).notNull(),
  autonomyNeed: int("autonomyNeed").default(50).notNull(),
  socialNeed: int("socialNeed").default(50).notNull(),
  
  // Attributes
  reliability: decimal("reliability", { precision: 5, scale: 2 }).default("1.00").notNull(),
  negotiationSkill: decimal("negotiationSkill", { precision: 5, scale: 2 }).default("1.00").notNull(),
  adaptability: decimal("adaptability", { precision: 5, scale: 2 }).default("1.00").notNull(),
  expertise: decimal("expertise", { precision: 5, scale: 2 }).default("1.00").notNull(),
  
  // Time-sensitive data
  lastInteraction: timestamp("lastInteraction"),
  nextScheduledEvent: timestamp("nextScheduledEvent"),
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ============================================================================
// AGENT TRAITS - Many-to-many relationship between agents and traits
// ============================================================================
export const agentTraits = mysqlTable("agent_traits", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  traitId: int("traitId").notNull(),
  intensity: int("intensity").default(50).notNull(), // 0-100, how strongly this trait manifests
  acquiredAt: timestamp("acquiredAt").defaultNow().notNull(),
});

export type AgentTrait = typeof agentTraits.$inferSelect;
export type InsertAgentTrait = typeof agentTraits.$inferInsert;

// ============================================================================
// RELATIONSHIPS - Connections between agents
// ============================================================================
export const relationships = mysqlTable("relationships", {
  id: int("id").autoincrement().primaryKey(),
  agent1Id: int("agent1Id").notNull(), // Lower ID always goes first
  agent2Id: int("agent2Id").notNull(),
  type: mysqlEnum("type", [
    "business",
    "personal",
    "professional",
    "familial",
    "competitive",
  ]).notNull(),
  
  // Relationship metrics (0-100)
  strength: int("strength").default(50).notNull(), // Overall relationship strength
  positivity: int("positivity").default(50).notNull(), // Positive vs negative sentiment
  frequency: int("frequency").default(50).notNull(), // How often they interact
  
  // History
  interactionCount: int("interactionCount").default(0).notNull(),
  lastInteraction: timestamp("lastInteraction"),
  
  // Status
  status: mysqlEnum("status", [
    "active",
    "dormant",
    "strained",
    "broken",
  ]).default("active").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Relationship = typeof relationships.$inferSelect;
export type InsertRelationship = typeof relationships.$inferInsert;

// ============================================================================
// GROUPS - Collections of agents with shared interests/goals
// ============================================================================
export const agentGroups = mysqlTable("agent_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: mysqlEnum("type", [
    "department",
    "team",
    "union",
    "association",
    "club",
    "network",
  ]).notNull(),
  description: text("description"),
  companyId: int("companyId"), // Null for external groups
  cityId: int("cityId"),
  
  // Group dynamics
  cohesion: int("cohesion").default(50).notNull(), // 0-100, how unified the group is
  influence: int("influence").default(50).notNull(), // 0-100, impact on members and external
  morale: int("morale").default(70).notNull(), // 0-100, overall group satisfaction
  
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentGroup = typeof agentGroups.$inferSelect;
export type InsertAgentGroup = typeof agentGroups.$inferInsert;

// ============================================================================
// GROUP MEMBERSHIPS - Agents belonging to groups
// ============================================================================
export const groupMemberships = mysqlTable("group_memberships", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  agentId: int("agentId").notNull(),
  role: mysqlEnum("role", [
    "leader",
    "core_member",
    "member",
    "associate",
  ]).default("member").notNull(),
  
  influence: int("influence").default(50).notNull(), // Agent's influence within the group
  commitment: int("commitment").default(50).notNull(), // Agent's dedication to group
  
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
});

export type GroupMembership = typeof groupMemberships.$inferSelect;
export type InsertGroupMembership = typeof groupMemberships.$inferInsert;

// ============================================================================
// COMMUNITIES - Larger social structures within cities
// ============================================================================
export const communities = mysqlTable("communities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  cityId: int("cityId").notNull(),
  type: mysqlEnum("type", [
    "residential",
    "business",
    "industrial",
    "cultural",
    "virtual",
  ]).notNull(),
  description: text("description"),
  
  // Community characteristics
  prosperity: int("prosperity").default(50).notNull(), // Economic wellbeing
  harmony: int("harmony").default(70).notNull(), // Social cohesion
  growth: int("growth").default(50).notNull(), // Development rate
  
  population: int("population").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Community = typeof communities.$inferSelect;
export type InsertCommunity = typeof communities.$inferInsert;

// ============================================================================
// COMMUNITY MEMBERSHIPS - Agents belonging to communities
// ============================================================================
export const communityMemberships = mysqlTable("community_memberships", {
  id: int("id").autoincrement().primaryKey(),
  communityId: int("communityId").notNull(),
  agentId: int("agentId").notNull(),
  influence: int("influence").default(10).notNull(), // Agent's impact on community
  reputation: int("reputation").default(50).notNull(), // How the community views this agent
  
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
});

export type CommunityMembership = typeof communityMemberships.$inferSelect;
export type InsertCommunityMembership = typeof communityMemberships.$inferInsert;

// ============================================================================
// EVENTS - Time-sensitive occurrences affecting agents and relationships
// ============================================================================
export const agentEvents = mysqlTable("agent_events", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", [
    "interaction",
    "transaction",
    "milestone",
    "crisis",
    "celebration",
    "conflict",
    "negotiation",
    "collaboration",
  ]).notNull(),
  
  // Participants
  initiatorAgentId: int("initiatorAgentId").notNull(),
  targetAgentId: int("targetAgentId"), // Null for non-interpersonal events
  groupId: int("groupId"), // If group-related
  companyId: int("companyId"), // If company-related
  
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  
  // Time
  scheduledAt: timestamp("scheduledAt").notNull(),
  occurredAt: timestamp("occurredAt"),
  duration: int("duration").default(0).notNull(), // Minutes
  
  // Impact metrics
  emotionalImpact: json("emotionalImpact").$type<{
    happiness?: number;
    satisfaction?: number;
    stress?: number;
    loyalty?: number;
    trust?: number;
  }>(),
  
  relationshipImpact: json("relationshipImpact").$type<{
    agentIds: number[];
    strengthChange: number;
    positivityChange: number;
  }>(),
  
  outcomes: json("outcomes").$type<{
    type: string;
    value: string | number;
    description: string;
  }[]>(),
  
  // Status
  status: mysqlEnum("status", [
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
    "failed",
  ]).default("scheduled").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentEvent = typeof agentEvents.$inferSelect;
export type InsertAgentEvent = typeof agentEvents.$inferInsert;

// ============================================================================
// EVENT TRIGGERS - Conditions that spawn events
// ============================================================================
export const eventTriggers = mysqlTable("event_triggers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  eventType: mysqlEnum("eventType", [
    "interaction",
    "transaction",
    "milestone",
    "crisis",
    "celebration",
    "conflict",
    "negotiation",
    "collaboration",
  ]).notNull(),
  
  // Trigger conditions (JSON for flexibility)
  conditions: json("conditions").$type<{
    type: string; // "threshold", "time", "relationship", "emotion"
    metric: string;
    operator: string; // ">", "<", "==", "!=", "between"
    value: number | string | number[];
  }[]>().notNull(),
  
  // Event generation parameters
  eventTemplate: json("eventTemplate").$type<{
    title: string;
    description: string;
    duration: number;
    impacts: Record<string, unknown>;
  }>(),
  
  priority: int("priority").default(50).notNull(), // Higher priority triggers fire first
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventTrigger = typeof eventTriggers.$inferSelect;
export type InsertEventTrigger = typeof eventTriggers.$inferInsert;

// ============================================================================
// AGENT HISTORIES - Track changes in agent states over time
// ============================================================================
export const agentHistories = mysqlTable("agent_histories", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  
  // Snapshot of key metrics
  happiness: int("happiness").notNull(),
  satisfaction: int("satisfaction").notNull(),
  stress: int("stress").notNull(),
  loyalty: int("loyalty").notNull(),
  trust: int("trust").notNull(),
  
  // Context
  eventId: int("eventId"), // What caused this state change
  relationshipId: int("relationshipId"), // If relationship-related
  notes: text("notes"),
  
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type AgentHistory = typeof agentHistories.$inferSelect;
export type InsertAgentHistory = typeof agentHistories.$inferInsert;

// ============================================================================
// AGENTIC SIMULATION RELATIONS
// ============================================================================
export const agentsRelations = relations(agents, ({ one, many }) => ({
  persona: one(characterPersonas, {
    fields: [agents.personaId],
    references: [characterPersonas.id],
  }),
  company: one(companies, {
    fields: [agents.companyId],
    references: [companies.id],
  }),
  businessUnit: one(businessUnits, {
    fields: [agents.businessUnitId],
    references: [businessUnits.id],
  }),
  city: one(cities, {
    fields: [agents.cityId],
    references: [cities.id],
  }),
  traits: many(agentTraits),
  relationships1: many(relationships, { relationName: "agent1" }),
  relationships2: many(relationships, { relationName: "agent2" }),
  groupMemberships: many(groupMemberships),
  communityMemberships: many(communityMemberships),
  initiatedEvents: many(agentEvents, { relationName: "initiator" }),
  targetedEvents: many(agentEvents, { relationName: "target" }),
  histories: many(agentHistories),
}));

export const agentTraitsRelations = relations(agentTraits, ({ one }) => ({
  agent: one(agents, {
    fields: [agentTraits.agentId],
    references: [agents.id],
  }),
  trait: one(characterTraits, {
    fields: [agentTraits.traitId],
    references: [characterTraits.id],
  }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  agent1: one(agents, {
    fields: [relationships.agent1Id],
    references: [agents.id],
    relationName: "agent1",
  }),
  agent2: one(agents, {
    fields: [relationships.agent2Id],
    references: [agents.id],
    relationName: "agent2",
  }),
}));

export const agentGroupsRelations = relations(agentGroups, ({ one, many }) => ({
  company: one(companies, {
    fields: [agentGroups.companyId],
    references: [companies.id],
  }),
  city: one(cities, {
    fields: [agentGroups.cityId],
    references: [cities.id],
  }),
  memberships: many(groupMemberships),
  events: many(agentEvents),
}));

export const groupMembershipsRelations = relations(groupMemberships, ({ one }) => ({
  group: one(agentGroups, {
    fields: [groupMemberships.groupId],
    references: [agentGroups.id],
  }),
  agent: one(agents, {
    fields: [groupMemberships.agentId],
    references: [agents.id],
  }),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  city: one(cities, {
    fields: [communities.cityId],
    references: [cities.id],
  }),
  memberships: many(communityMemberships),
}));

export const communityMembershipsRelations = relations(communityMemberships, ({ one }) => ({
  community: one(communities, {
    fields: [communityMemberships.communityId],
    references: [communities.id],
  }),
  agent: one(agents, {
    fields: [communityMemberships.agentId],
    references: [agents.id],
  }),
}));

export const agentEventsRelations = relations(agentEvents, ({ one }) => ({
  initiator: one(agents, {
    fields: [agentEvents.initiatorAgentId],
    references: [agents.id],
    relationName: "initiator",
  }),
  target: one(agents, {
    fields: [agentEvents.targetAgentId],
    references: [agents.id],
    relationName: "target",
  }),
  group: one(agentGroups, {
    fields: [agentEvents.groupId],
    references: [agentGroups.id],
  }),
  company: one(companies, {
    fields: [agentEvents.companyId],
    references: [companies.id],
  }),
}));

export const agentHistoriesRelations = relations(agentHistories, ({ one }) => ({
  agent: one(agents, {
    fields: [agentHistories.agentId],
    references: [agents.id],
  }),
  event: one(agentEvents, {
    fields: [agentHistories.eventId],
    references: [agentEvents.id],
  }),
  relationship: one(relationships, {
    fields: [agentHistories.relationshipId],
    references: [relationships.id],
  }),
}));
