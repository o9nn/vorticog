import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createCompany,
  getCompanyByUserId,
  getCompanyById,
  getAllCompanies,
  updateCompanyCash,
  createBusinessUnit,
  getBusinessUnitsByCompany,
  getBusinessUnitById,
  updateBusinessUnit,
  getAllCities,
  getCityById,
  getAllResourceTypes,
  getResourceTypeById,
  createEmployees,
  getEmployeesByUnit,
  updateEmployees,
  getInventoryByUnit,
  upsertInventory,
  createMarketListing,
  getMarketListings,
  createTransaction,
  getTransactionsByCompany,
  createNotification,
  getNotificationsByUser,
  markNotificationRead,
  getGameState,
  initializeGameData,
  getProductionRecipes,
  getProductionRecipeById,
  addToProductionQueue,
  getProductionQueue,
  purchaseFromMarket,
  getMarketListingById,
  cancelMarketListing,
  seedProductionRecipes,
} from "./db";

// Initialize game data on server start
initializeGameData().then(() => seedProductionRecipes()).catch(console.error);

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================================================
  // COMPANY ROUTES
  // ============================================================================
  company: router({
    // Get current user's company
    mine: protectedProcedure.query(async ({ ctx }) => {
      return await getCompanyByUserId(ctx.user.id);
    }),

    // Create a new company
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(128),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if user already has a company
        const existing = await getCompanyByUserId(ctx.user.id);
        if (existing) {
          throw new Error("You already have a company");
        }

        const company = await createCompany({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          cash: "1000000.00", // Starting capital
        });

        if (company) {
          // Create notification
          await createNotification({
            userId: ctx.user.id,
            type: "success",
            title: "Company Founded!",
            message: `Congratulations! ${input.name} has been established with $1,000,000 starting capital.`,
          });
        }

        return company;
      }),

    // Get company by ID
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getCompanyById(input.id);
      }),

    // Get all companies (for leaderboard)
    all: protectedProcedure.query(async () => {
      return await getAllCompanies();
    }),
  }),

  // ============================================================================
  // BUSINESS UNIT ROUTES
  // ============================================================================
  businessUnit: router({
    // Get all units for current company
    list: protectedProcedure.query(async ({ ctx }) => {
      const company = await getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await getBusinessUnitsByCompany(company.id);
    }),

    // Get single unit by ID
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getBusinessUnitById(input.id);
      }),

    // Create a new business unit
    create: protectedProcedure
      .input(
        z.object({
          type: z.enum(["office", "store", "factory", "mine", "farm", "laboratory"]),
          name: z.string().min(2).max(128),
          cityId: z.number(),
          size: z.number().min(50).max(10000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        if (!company) {
          throw new Error("You need to create a company first");
        }

        // Calculate construction cost based on type and size
        const baseCosts: Record<string, number> = {
          office: 50000,
          store: 100000,
          factory: 500000,
          mine: 1000000,
          farm: 200000,
          laboratory: 750000,
        };

        const size = input.size || 100;
        const cost = baseCosts[input.type] * (size / 100);

        if (parseFloat(company.cash) < cost) {
          throw new Error(`Insufficient funds. Need $${cost.toLocaleString()}`);
        }

        // Deduct cost
        const newCash = (parseFloat(company.cash) - cost).toFixed(2);
        await updateCompanyCash(company.id, newCash);

        // Create the unit
        const unit = await createBusinessUnit({
          companyId: company.id,
          type: input.type,
          name: input.name,
          cityId: input.cityId,
          size: size,
        });

        if (unit) {
          // Create initial employees record
          await createEmployees({
            businessUnitId: unit.id,
            count: 0,
            salary: "1000.00",
          });

          // Record transaction
          await createTransaction({
            type: "construction",
            companyId: company.id,
            amount: (-cost).toFixed(2),
            description: `Built ${input.type}: ${input.name}`,
            relatedUnitId: unit.id,
          });

          // Notification
          await createNotification({
            userId: ctx.user.id,
            type: "success",
            title: "Construction Complete",
            message: `${input.name} (${input.type}) has been built in the selected city.`,
          });
        }

        return unit;
      }),

    // Update business unit
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(2).max(128).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const unit = await getBusinessUnitById(input.id);
        if (!unit) throw new Error("Unit not found");

        const company = await getCompanyByUserId(ctx.user.id);
        if (!company || unit.companyId !== company.id) {
          throw new Error("Not authorized");
        }

        await updateBusinessUnit(input.id, {
          name: input.name,
          isActive: input.isActive,
        });

        return await getBusinessUnitById(input.id);
      }),

    // Get employees for a unit
    employees: protectedProcedure
      .input(z.object({ unitId: z.number() }))
      .query(async ({ input }) => {
        return await getEmployeesByUnit(input.unitId);
      }),

    // Hire/update employees
    updateEmployees: protectedProcedure
      .input(
        z.object({
          unitId: z.number(),
          count: z.number().min(0),
          salary: z.number().min(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const unit = await getBusinessUnitById(input.unitId);
        if (!unit) throw new Error("Unit not found");

        const company = await getCompanyByUserId(ctx.user.id);
        if (!company || unit.companyId !== company.id) {
          throw new Error("Not authorized");
        }

        await updateEmployees(input.unitId, {
          count: input.count,
          salary: input.salary.toFixed(2),
        });

        return await getEmployeesByUnit(input.unitId);
      }),

    // Get inventory for a unit
    inventory: protectedProcedure
      .input(z.object({ unitId: z.number() }))
      .query(async ({ input }) => {
        return await getInventoryByUnit(input.unitId);
      }),
  }),

  // ============================================================================
  // CITY ROUTES
  // ============================================================================
  city: router({
    list: protectedProcedure.query(async () => {
      return await getAllCities();
    }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getCityById(input.id);
      }),
  }),

  // ============================================================================
  // RESOURCE ROUTES
  // ============================================================================
  resource: router({
    list: protectedProcedure.query(async () => {
      return await getAllResourceTypes();
    }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getResourceTypeById(input.id);
      }),
  }),

  // ============================================================================
  // MARKET ROUTES
  // ============================================================================
  market: router({
    listings: protectedProcedure
      .input(
        z.object({
          resourceTypeId: z.number().optional(),
          cityId: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await getMarketListings(input?.resourceTypeId, input?.cityId);
      }),

    createListing: protectedProcedure
      .input(
        z.object({
          businessUnitId: z.number(),
          resourceTypeId: z.number(),
          quantity: z.number().positive(),
          pricePerUnit: z.number().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        if (!company) throw new Error("No company found");

        const unit = await getBusinessUnitById(input.businessUnitId);
        if (!unit || unit.companyId !== company.id) {
          throw new Error("Not authorized");
        }

        await createMarketListing({
          companyId: company.id,
          businessUnitId: input.businessUnitId,
          resourceTypeId: input.resourceTypeId,
          quantity: input.quantity.toFixed(4),
          pricePerUnit: input.pricePerUnit.toFixed(2),
          cityId: unit.cityId,
        });

        return { success: true };
      }),

    // Get a specific listing
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getMarketListingById(input.id);
      }),

    // Purchase from market
    purchase: protectedProcedure
      .input(
        z.object({
          listingId: z.number(),
          quantity: z.number().positive(),
          destinationUnitId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        if (!company) throw new Error("No company found");

        // Verify the destination unit belongs to the buyer
        const unit = await getBusinessUnitById(input.destinationUnitId);
        if (!unit || unit.companyId !== company.id) {
          throw new Error("Invalid destination unit");
        }

        const result = await purchaseFromMarket(
          company.id,
          input.listingId,
          input.quantity,
          input.destinationUnitId
        );

        if (!result.success) {
          throw new Error(result.message);
        }

        return result;
      }),

    // Cancel a listing
    cancel: protectedProcedure
      .input(z.object({ listingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        if (!company) throw new Error("No company found");

        const result = await cancelMarketListing(input.listingId, company.id);
        if (!result.success) {
          throw new Error(result.message);
        }

        return result;
      }),
  }),

  // ============================================================================
  // PRODUCTION ROUTES
  // ============================================================================
  production: router({
    // Get available recipes for a unit type
    recipes: protectedProcedure
      .input(
        z.object({
          unitType: z.enum(["factory", "farm", "mine", "laboratory"]).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await getProductionRecipes(input?.unitType);
      }),

    // Get a specific recipe
    recipeById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductionRecipeById(input.id);
      }),

    // Get production queue for a unit
    queue: protectedProcedure
      .input(z.object({ unitId: z.number() }))
      .query(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        if (!company) return [];

        const unit = await getBusinessUnitById(input.unitId);
        if (!unit || unit.companyId !== company.id) {
          throw new Error("Not authorized");
        }

        return await getProductionQueue(input.unitId);
      }),

    // Start production
    start: protectedProcedure
      .input(
        z.object({
          unitId: z.number(),
          recipeId: z.number(),
          quantity: z.number().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        if (!company) throw new Error("No company found");

        const unit = await getBusinessUnitById(input.unitId);
        if (!unit || unit.companyId !== company.id) {
          throw new Error("Not authorized");
        }

        // Verify recipe is valid for this unit type
        const recipe = await getProductionRecipeById(input.recipeId);
        if (!recipe || recipe.unitType !== unit.type) {
          throw new Error("Invalid recipe for this unit type");
        }

        // Add to production queue
        await addToProductionQueue({
          businessUnitId: input.unitId,
          recipeId: input.recipeId,
          quantity: input.quantity,
        });

        await createNotification({
          userId: ctx.user.id,
          type: "production",
          title: "Production Started",
          message: `Started producing ${input.quantity} units at ${unit.name}`,
        });

        return { success: true };
      }),
  }),

  // ============================================================================
  // TRANSACTION ROUTES
  // ============================================================================
  transaction: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        if (!company) return [];
        return await getTransactionsByCompany(company.id, input?.limit || 50);
      }),
  }),

  // ============================================================================
  // NOTIFICATION ROUTES
  // ============================================================================
  notification: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getNotificationsByUser(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationRead(input.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // GAME STATE ROUTES
  // ============================================================================
  game: router({
    state: protectedProcedure.query(async () => {
      return await getGameState();
    }),
  }),
});

export type AppRouter = typeof appRouter;
