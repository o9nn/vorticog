import { and, eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  companies,
  InsertCompany,
  Company,
  businessUnits,
  InsertBusinessUnit,
  BusinessUnit,
  cities,
  City,
  employees,
  InsertEmployee,
  inventory,
  InsertInventory,
  resourceTypes,
  ResourceType,
  marketListings,
  InsertMarketListing,
  transactions,
  InsertTransaction,
  notifications,
  InsertNotification,
  gameState,
  technologies,
  companyTechnologies,
  productionRecipes,
  productionQueue,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// COMPANY OPERATIONS
// ============================================================================
export async function createCompany(data: InsertCompany): Promise<Company | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(companies).values(data);
  const insertId = result[0].insertId;
  
  const created = await db
    .select()
    .from(companies)
    .where(eq(companies.id, insertId))
    .limit(1);
  
  return created[0] || null;
}

export async function getCompanyByUserId(userId: number): Promise<Company | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.userId, userId))
    .limit(1);

  return result[0] || null;
}

export async function getCompanyById(id: number): Promise<Company | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateCompanyCash(
  companyId: number,
  amount: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(companies)
    .set({ cash: amount })
    .where(eq(companies.id, companyId));
}

export async function getAllCompanies(): Promise<Company[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(companies).orderBy(desc(companies.cash));
}

// ============================================================================
// BUSINESS UNIT OPERATIONS
// ============================================================================
export async function createBusinessUnit(
  data: InsertBusinessUnit
): Promise<BusinessUnit | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(businessUnits).values(data);
  const insertId = result[0].insertId;

  const created = await db
    .select()
    .from(businessUnits)
    .where(eq(businessUnits.id, insertId))
    .limit(1);

  return created[0] || null;
}

export async function getBusinessUnitsByCompany(
  companyId: number
): Promise<BusinessUnit[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(businessUnits)
    .where(eq(businessUnits.companyId, companyId));
}

export async function getBusinessUnitById(
  id: number
): Promise<BusinessUnit | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(businessUnits)
    .where(eq(businessUnits.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateBusinessUnit(
  id: number,
  data: Partial<InsertBusinessUnit>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(businessUnits).set(data).where(eq(businessUnits.id, id));
}

// ============================================================================
// CITY OPERATIONS
// ============================================================================
export async function getAllCities(): Promise<City[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(cities).orderBy(cities.name);
}

export async function getCityById(id: number): Promise<City | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(cities).where(eq(cities.id, id)).limit(1);
  return result[0] || null;
}

export async function seedCities(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existingCities = await db.select().from(cities).limit(1);
  if (existingCities.length > 0) return;

  const defaultCities = [
    { name: "New York", country: "USA", population: 8336817, wealthIndex: "1.50", taxRate: "0.2500" },
    { name: "Los Angeles", country: "USA", population: 3979576, wealthIndex: "1.40", taxRate: "0.2300" },
    { name: "Chicago", country: "USA", population: 2693976, wealthIndex: "1.30", taxRate: "0.2200" },
    { name: "London", country: "UK", population: 8982000, wealthIndex: "1.60", taxRate: "0.2800" },
    { name: "Paris", country: "France", population: 2161000, wealthIndex: "1.45", taxRate: "0.3000" },
    { name: "Berlin", country: "Germany", population: 3645000, wealthIndex: "1.35", taxRate: "0.2600" },
    { name: "Tokyo", country: "Japan", population: 13960000, wealthIndex: "1.55", taxRate: "0.2400" },
    { name: "Shanghai", country: "China", population: 24870000, wealthIndex: "1.20", taxRate: "0.2000" },
    { name: "Mumbai", country: "India", population: 12442373, wealthIndex: "0.90", taxRate: "0.1800" },
    { name: "São Paulo", country: "Brazil", population: 12325232, wealthIndex: "1.00", taxRate: "0.2100" },
    { name: "Sydney", country: "Australia", population: 5312163, wealthIndex: "1.45", taxRate: "0.2700" },
    { name: "Dubai", country: "UAE", population: 3331420, wealthIndex: "1.70", taxRate: "0.0500" },
  ];

  await db.insert(cities).values(defaultCities);
}

// ============================================================================
// RESOURCE TYPE OPERATIONS
// ============================================================================
export async function getAllResourceTypes(): Promise<ResourceType[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(resourceTypes).orderBy(resourceTypes.name);
}

export async function getResourceTypeById(id: number): Promise<ResourceType | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(resourceTypes)
    .where(eq(resourceTypes.id, id))
    .limit(1);

  return result[0] || null;
}

export async function seedResourceTypes(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(resourceTypes).limit(1);
  if (existing.length > 0) return;

  const defaultResources = [
    // Raw Materials
    { code: "iron_ore", name: "Iron Ore", category: "raw_material" as const, basePrice: "50.00", unit: "tons", icon: "⛏️" },
    { code: "coal", name: "Coal", category: "raw_material" as const, basePrice: "30.00", unit: "tons", icon: "�ite" },
    { code: "oil", name: "Crude Oil", category: "raw_material" as const, basePrice: "80.00", unit: "barrels", icon: "🛢️" },
    { code: "wood", name: "Timber", category: "raw_material" as const, basePrice: "25.00", unit: "m³", icon: "🪵" },
    { code: "cotton", name: "Cotton", category: "raw_material" as const, basePrice: "40.00", unit: "bales", icon: "🌿" },
    { code: "wheat", name: "Wheat", category: "raw_material" as const, basePrice: "15.00", unit: "tons", icon: "🌾" },
    
    // Intermediate Goods
    { code: "steel", name: "Steel", category: "intermediate" as const, basePrice: "200.00", unit: "tons", icon: "🔩" },
    { code: "plastic", name: "Plastic", category: "intermediate" as const, basePrice: "150.00", unit: "tons", icon: "♻️" },
    { code: "fabric", name: "Fabric", category: "intermediate" as const, basePrice: "100.00", unit: "rolls", icon: "🧵" },
    { code: "flour", name: "Flour", category: "intermediate" as const, basePrice: "35.00", unit: "tons", icon: "🌾" },
    { code: "lumber", name: "Lumber", category: "intermediate" as const, basePrice: "60.00", unit: "m³", icon: "🪓" },
    
    // Finished Goods
    { code: "cars", name: "Automobiles", category: "finished_good" as const, basePrice: "25000.00", unit: "units", icon: "🚗" },
    { code: "electronics", name: "Electronics", category: "finished_good" as const, basePrice: "500.00", unit: "units", icon: "📱" },
    { code: "clothing", name: "Clothing", category: "finished_good" as const, basePrice: "50.00", unit: "units", icon: "👕" },
    { code: "furniture", name: "Furniture", category: "finished_good" as const, basePrice: "300.00", unit: "units", icon: "🪑" },
    { code: "food", name: "Processed Food", category: "finished_good" as const, basePrice: "20.00", unit: "units", icon: "🍞" },
    
    // Equipment
    { code: "machinery", name: "Industrial Machinery", category: "equipment" as const, basePrice: "50000.00", unit: "units", icon: "⚙️" },
    { code: "computers", name: "Computers", category: "equipment" as const, basePrice: "1000.00", unit: "units", icon: "💻" },
  ];

  await db.insert(resourceTypes).values(defaultResources);
}

// ============================================================================
// EMPLOYEE OPERATIONS
// ============================================================================
export async function createEmployees(data: InsertEmployee): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(employees).values(data);
}

export async function getEmployeesByUnit(businessUnitId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(employees)
    .where(eq(employees.businessUnitId, businessUnitId))
    .limit(1);

  return result[0] || null;
}

export async function updateEmployees(
  businessUnitId: number,
  data: Partial<InsertEmployee>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(employees)
    .set(data)
    .where(eq(employees.businessUnitId, businessUnitId));
}

// ============================================================================
// INVENTORY OPERATIONS
// ============================================================================
export async function getInventoryByUnit(businessUnitId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      inventory: inventory,
      resourceType: resourceTypes,
    })
    .from(inventory)
    .leftJoin(resourceTypes, eq(inventory.resourceTypeId, resourceTypes.id))
    .where(eq(inventory.businessUnitId, businessUnitId));
}

export async function upsertInventory(data: InsertInventory): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(inventory)
    .where(
      and(
        eq(inventory.businessUnitId, data.businessUnitId),
        eq(inventory.resourceTypeId, data.resourceTypeId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(inventory)
      .set({
        quantity: data.quantity,
        quality: data.quality,
        averageCost: data.averageCost,
      })
      .where(eq(inventory.id, existing[0].id));
  } else {
    await db.insert(inventory).values(data);
  }
}

// ============================================================================
// MARKET OPERATIONS
// ============================================================================
export async function createMarketListing(
  data: InsertMarketListing
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(marketListings).values(data);
}

export async function getMarketListings(
  resourceTypeId?: number,
  cityId?: number
) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      listing: marketListings,
      company: companies,
      resourceType: resourceTypes,
      city: cities,
    })
    .from(marketListings)
    .leftJoin(companies, eq(marketListings.companyId, companies.id))
    .leftJoin(resourceTypes, eq(marketListings.resourceTypeId, resourceTypes.id))
    .leftJoin(cities, eq(marketListings.cityId, cities.id))
    .where(eq(marketListings.isActive, true));

  return await query;
}

// ============================================================================
// TRANSACTION OPERATIONS
// ============================================================================
export async function createTransaction(data: InsertTransaction): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(transactions).values(data);
}

export async function getTransactionsByCompany(
  companyId: number,
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.companyId, companyId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================
export async function createNotification(data: InsertNotification): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(notifications).values(data);
}

export async function getNotificationsByUser(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id));
}

// ============================================================================
// GAME STATE OPERATIONS
// ============================================================================
export async function getGameState() {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(gameState).limit(1);
  
  if (result.length === 0) {
    // Initialize game state
    await db.insert(gameState).values({
      currentTurn: 1,
      turnDuration: 3600,
    });
    const newState = await db.select().from(gameState).limit(1);
    return newState[0] || null;
  }
  
  return result[0];
}

export async function incrementGameTurn(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(gameState)
    .set({
      currentTurn: sql`${gameState.currentTurn} + 1`,
      lastTurnProcessed: new Date(),
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================
export async function initializeGameData(): Promise<void> {
  await seedCities();
  await seedResourceTypes();
  await getGameState(); // Ensures game state exists
}


// ============================================================================
// PRODUCTION OPERATIONS
// ============================================================================
export async function getProductionRecipes(unitType?: "factory" | "farm" | "mine" | "laboratory") {
  const db = await getDb();
  if (!db) return [];

  if (unitType) {
    return await db
      .select()
      .from(productionRecipes)
      .where(eq(productionRecipes.unitType, unitType));
  }

  return await db.select().from(productionRecipes);
}

export async function getProductionRecipeById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(productionRecipes)
    .where(eq(productionRecipes.id, id))
    .limit(1);

  return result[0] || null;
}

export async function addToProductionQueue(data: {
  businessUnitId: number;
  recipeId: number;
  quantity: number;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(productionQueue).values({
    businessUnitId: data.businessUnitId,
    recipeId: data.recipeId,
    quantity: data.quantity.toFixed(4),
  });
}

export async function getProductionQueue(businessUnitId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      queue: productionQueue,
      recipe: productionRecipes,
    })
    .from(productionQueue)
    .leftJoin(productionRecipes, eq(productionQueue.recipeId, productionRecipes.id))
    .where(eq(productionQueue.businessUnitId, businessUnitId))
    .orderBy(productionQueue.createdAt);
}

// ============================================================================
// MARKET TRADING OPERATIONS
// ============================================================================
export async function purchaseFromMarket(
  buyerCompanyId: number,
  listingId: number,
  quantity: number,
  buyerUnitId: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  // Get the listing
  const listingResult = await db
    .select()
    .from(marketListings)
    .where(eq(marketListings.id, listingId))
    .limit(1);

  if (listingResult.length === 0) {
    return { success: false, message: "Listing not found" };
  }

  const listing = listingResult[0];

  if (!listing.isActive) {
    return { success: false, message: "Listing is no longer active" };
  }

  const availableQty = parseFloat(listing.quantity);
  if (quantity > availableQty) {
    return { success: false, message: "Insufficient quantity available" };
  }

  const totalCost = quantity * parseFloat(listing.pricePerUnit);

  // Get buyer company
  const buyerResult = await db
    .select()
    .from(companies)
    .where(eq(companies.id, buyerCompanyId))
    .limit(1);

  if (buyerResult.length === 0) {
    return { success: false, message: "Buyer company not found" };
  }

  const buyer = buyerResult[0];

  if (parseFloat(buyer.cash) < totalCost) {
    return { success: false, message: "Insufficient funds" };
  }

  // Get seller company
  const sellerResult = await db
    .select()
    .from(companies)
    .where(eq(companies.id, listing.companyId))
    .limit(1);

  if (sellerResult.length === 0) {
    return { success: false, message: "Seller company not found" };
  }

  const seller = sellerResult[0];

  // Execute the trade
  // 1. Deduct cash from buyer
  await db
    .update(companies)
    .set({ cash: (parseFloat(buyer.cash) - totalCost).toFixed(2) })
    .where(eq(companies.id, buyerCompanyId));

  // 2. Add cash to seller
  await db
    .update(companies)
    .set({ cash: (parseFloat(seller.cash) + totalCost).toFixed(2) })
    .where(eq(companies.id, listing.companyId));

  // 3. Update or remove listing
  const newQty = availableQty - quantity;
  if (newQty <= 0) {
    await db
      .update(marketListings)
      .set({ isActive: false, quantity: "0" })
      .where(eq(marketListings.id, listingId));
  } else {
    await db
      .update(marketListings)
      .set({ quantity: newQty.toFixed(4) })
      .where(eq(marketListings.id, listingId));
  }

  // 4. Add inventory to buyer's unit
  await upsertInventory({
    businessUnitId: buyerUnitId,
    resourceTypeId: listing.resourceTypeId,
    quantity: quantity.toFixed(4),
    quality: listing.quality,
  });

  // 5. Record transactions
  await createTransaction({
    type: "purchase",
    companyId: buyerCompanyId,
    amount: (-totalCost).toFixed(2),
    description: `Purchased ${quantity} units from market`,
    relatedUnitId: buyerUnitId,
  });

  await createTransaction({
    type: "sale",
    companyId: listing.companyId,
    amount: totalCost.toFixed(2),
    description: `Sold ${quantity} units on market`,
    relatedUnitId: listing.businessUnitId,
  });

  return { success: true, message: "Purchase completed successfully" };
}

export async function getMarketListingById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      listing: marketListings,
      company: companies,
      resourceType: resourceTypes,
      city: cities,
    })
    .from(marketListings)
    .leftJoin(companies, eq(marketListings.companyId, companies.id))
    .leftJoin(resourceTypes, eq(marketListings.resourceTypeId, resourceTypes.id))
    .leftJoin(cities, eq(marketListings.cityId, cities.id))
    .where(eq(marketListings.id, id))
    .limit(1);

  return result[0] || null;
}

export async function cancelMarketListing(listingId: number, companyId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  const listing = await db
    .select()
    .from(marketListings)
    .where(eq(marketListings.id, listingId))
    .limit(1);

  if (listing.length === 0) {
    return { success: false, message: "Listing not found" };
  }

  if (listing[0].companyId !== companyId) {
    return { success: false, message: "Not authorized" };
  }

  // Return inventory to the unit
  await upsertInventory({
    businessUnitId: listing[0].businessUnitId,
    resourceTypeId: listing[0].resourceTypeId,
    quantity: listing[0].quantity,
    quality: listing[0].quality,
  });

  // Deactivate listing
  await db
    .update(marketListings)
    .set({ isActive: false })
    .where(eq(marketListings.id, listingId));

  return { success: true, message: "Listing cancelled" };
}

// ============================================================================
// SEED PRODUCTION RECIPES
// ============================================================================
export async function seedProductionRecipes(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if recipes already exist
  const existing = await db.select().from(productionRecipes).limit(1);
  if (existing.length > 0) return;

  // Get resource type IDs
  const resources = await db.select().from(resourceTypes);
  const resourceMap = new Map(resources.map((r) => [r.name, r.id]));

  type UnitType = "factory" | "farm" | "mine" | "laboratory";

  const recipes: Array<{
    name: string;
    unitType: UnitType;
    outputResourceId: number | undefined;
    outputQuantity: string;
    inputResources: { resourceId: number | undefined; quantity: number }[];
    productionTime: number;
    requiredEmployees: number;
  }> = [
    // Mining recipes
    {
      name: "Iron Ore Extraction",
      unitType: "mine" as UnitType,
      outputResourceId: resourceMap.get("Iron Ore"),
      outputQuantity: "100.0000",
      inputResources: [],
      productionTime: 3600,
      requiredEmployees: 10,
    },
    {
      name: "Coal Mining",
      unitType: "mine" as UnitType,
      outputResourceId: resourceMap.get("Coal"),
      outputQuantity: "150.0000",
      inputResources: [],
      productionTime: 3600,
      requiredEmployees: 8,
    },
    {
      name: "Bauxite Mining",
      unitType: "mine" as UnitType,
      outputResourceId: resourceMap.get("Bauxite"),
      outputQuantity: "80.0000",
      inputResources: [],
      productionTime: 3600,
      requiredEmployees: 12,
    },
    // Farm recipes
    {
      name: "Wheat Farming",
      unitType: "farm" as UnitType,
      outputResourceId: resourceMap.get("Wheat"),
      outputQuantity: "200.0000",
      inputResources: [],
      productionTime: 7200,
      requiredEmployees: 5,
    },
    {
      name: "Cotton Farming",
      unitType: "farm" as UnitType,
      outputResourceId: resourceMap.get("Cotton"),
      outputQuantity: "100.0000",
      inputResources: [],
      productionTime: 7200,
      requiredEmployees: 6,
    },
    {
      name: "Cattle Ranching",
      unitType: "farm" as UnitType,
      outputResourceId: resourceMap.get("Cattle"),
      outputQuantity: "50.0000",
      inputResources: [{ resourceId: resourceMap.get("Wheat"), quantity: 100 }],
      productionTime: 14400,
      requiredEmployees: 8,
    },
    // Factory recipes
    {
      name: "Steel Production",
      unitType: "factory" as UnitType,
      outputResourceId: resourceMap.get("Steel"),
      outputQuantity: "50.0000",
      inputResources: [
        { resourceId: resourceMap.get("Iron Ore"), quantity: 100 },
        { resourceId: resourceMap.get("Coal"), quantity: 50 },
      ],
      productionTime: 7200,
      requiredEmployees: 15,
    },
    {
      name: "Aluminum Production",
      unitType: "factory" as UnitType,
      outputResourceId: resourceMap.get("Aluminum"),
      outputQuantity: "40.0000",
      inputResources: [
        { resourceId: resourceMap.get("Bauxite"), quantity: 80 },
      ],
      productionTime: 7200,
      requiredEmployees: 12,
    },
    {
      name: "Textile Production",
      unitType: "factory" as UnitType,
      outputResourceId: resourceMap.get("Textiles"),
      outputQuantity: "100.0000",
      inputResources: [
        { resourceId: resourceMap.get("Cotton"), quantity: 50 },
      ],
      productionTime: 3600,
      requiredEmployees: 20,
    },
    {
      name: "Electronics Assembly",
      unitType: "factory" as UnitType,
      outputResourceId: resourceMap.get("Electronics"),
      outputQuantity: "20.0000",
      inputResources: [
        { resourceId: resourceMap.get("Steel"), quantity: 10 },
        { resourceId: resourceMap.get("Aluminum"), quantity: 5 },
      ],
      productionTime: 7200,
      requiredEmployees: 25,
    },
    {
      name: "Automobile Manufacturing",
      unitType: "factory" as UnitType,
      outputResourceId: resourceMap.get("Automobiles"),
      outputQuantity: "5.0000",
      inputResources: [
        { resourceId: resourceMap.get("Steel"), quantity: 50 },
        { resourceId: resourceMap.get("Aluminum"), quantity: 20 },
        { resourceId: resourceMap.get("Electronics"), quantity: 10 },
        { resourceId: resourceMap.get("Textiles"), quantity: 15 },
      ],
      productionTime: 14400,
      requiredEmployees: 50,
    },
    {
      name: "Furniture Production",
      unitType: "factory" as UnitType,
      outputResourceId: resourceMap.get("Furniture"),
      outputQuantity: "30.0000",
      inputResources: [
        { resourceId: resourceMap.get("Timber"), quantity: 40 },
        { resourceId: resourceMap.get("Textiles"), quantity: 10 },
      ],
      productionTime: 5400,
      requiredEmployees: 15,
    },
    {
      name: "Clothing Production",
      unitType: "factory" as UnitType,
      outputResourceId: resourceMap.get("Clothing"),
      outputQuantity: "100.0000",
      inputResources: [
        { resourceId: resourceMap.get("Textiles"), quantity: 30 },
      ],
      productionTime: 3600,
      requiredEmployees: 30,
    },
    {
      name: "Food Processing",
      unitType: "factory" as UnitType,
      outputResourceId: resourceMap.get("Processed Food"),
      outputQuantity: "150.0000",
      inputResources: [
        { resourceId: resourceMap.get("Wheat"), quantity: 100 },
        { resourceId: resourceMap.get("Cattle"), quantity: 20 },
      ],
      productionTime: 3600,
      requiredEmployees: 20,
    },
  ];

  for (const recipe of recipes) {
    if (recipe.outputResourceId) {
      await db.insert(productionRecipes).values({
        unitType: recipe.unitType,
        outputResourceId: recipe.outputResourceId,
        outputQuantity: recipe.outputQuantity,
        inputResources: recipe.inputResources.filter(i => i.resourceId !== undefined) as { resourceId: number; quantity: number }[],
        laborRequired: recipe.requiredEmployees,
        timeRequired: Math.floor(recipe.productionTime / 3600),
        description: recipe.name,
      });
    }
  }
}
