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
  // Agentic simulation functions
  getAllCharacterPersonas,
  getCharacterPersonaById,
  getAllCharacterTraits,
  getCharacterTraitsByCategory,
  createAgent,
  getAgentById,
  getAgentsByType,
  getAgentsByCompany,
  getAgentsByBusinessUnit,
  updateAgent,
  updateAgentEmotionalState,
  getAgentTraits,
  addTraitToAgent,
  removeTraitFromAgent,
  createRelationship,
  getRelationshipBetweenAgents,
  getAgentRelationships,
  updateRelationship,
  recordRelationshipInteraction,
  createAgentGroup,
  getAgentGroupById,
  getAgentGroupsByCompany,
  getGroupMembers,
  getAgentGroups,
  addAgentToGroup,
  removeAgentFromGroup,
  createCommunity,
  getCommunityById,
  getCommunitiesByCity,
  getCommunityMembers,
  getAgentCommunities,
  addAgentToCommunity,
  createAgentEvent,
  getAgentEventById,
  getAgentEvents,
  getScheduledEvents,
  updateAgentEvent,
  processAgentEvent,
  getActiveEventTriggers,
  getAgentHistory,
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
  // AGENTIC SIMULATION ROUTES
  // ============================================================================
  
  // Character Personas
  persona: router({
    list: protectedProcedure.query(async () => {
      return await getAllCharacterPersonas();
    }),
    
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getCharacterPersonaById(input.id);
      }),
  }),

  // Character Traits
  trait: router({
    list: protectedProcedure.query(async () => {
      return await getAllCharacterTraits();
    }),
    
    byCategory: protectedProcedure
      .input(z.object({ 
        category: z.enum(["professional", "social", "cognitive", "emotional"]) 
      }))
      .query(async ({ input }) => {
        return await getCharacterTraitsByCategory(input.category);
      }),
  }),

  // Agents (Customers, Suppliers, Employees, Partners)
  agent: router({
    // Create a new agent
    create: protectedProcedure
      .input(
        z.object({
          type: z.enum(["customer", "supplier", "employee", "partner", "investor", "competitor"]),
          name: z.string().min(2).max(128),
          personaId: z.number(),
          cityId: z.number(),
          companyId: z.number().optional(),
          businessUnitId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        
        // Validate ownership if company/unit specified
        if (input.companyId && (!company || input.companyId !== company.id)) {
          throw new Error("Not authorized to create agent for this company");
        }
        
        if (input.businessUnitId) {
          const unit = await getBusinessUnitById(input.businessUnitId);
          if (!unit || !company || unit.companyId !== company.id) {
            throw new Error("Not authorized to create agent for this business unit");
          }
        }

        const agent = await createAgent({
          type: input.type,
          name: input.name,
          personaId: input.personaId,
          cityId: input.cityId,
          companyId: input.companyId,
          businessUnitId: input.businessUnitId,
        });

        return agent;
      }),

    // Get agent by ID
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getAgentById(input.id);
      }),

    // Get agents by type
    byType: protectedProcedure
      .input(z.object({ 
        type: z.enum(["customer", "supplier", "employee", "partner", "investor", "competitor"]) 
      }))
      .query(async ({ input }) => {
        return await getAgentsByType(input.type);
      }),

    // Get agents for current user's company
    byCompany: protectedProcedure.query(async ({ ctx }) => {
      const company = await getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await getAgentsByCompany(company.id);
    }),

    // Get agents by business unit
    byBusinessUnit: protectedProcedure
      .input(z.object({ businessUnitId: z.number() }))
      .query(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        const unit = await getBusinessUnitById(input.businessUnitId);
        
        if (!unit || !company || unit.companyId !== company.id) {
          throw new Error("Not authorized");
        }
        
        return await getAgentsByBusinessUnit(input.businessUnitId);
      }),

    // Update agent
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          updates: z.object({
            name: z.string().optional(),
            isActive: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const agent = await getAgentById(input.id);
        if (!agent) throw new Error("Agent not found");

        // Verify ownership
        if (agent.companyId) {
          const company = await getCompanyByUserId(ctx.user.id);
          if (!company || agent.companyId !== company.id) {
            throw new Error("Not authorized");
          }
        }

        await updateAgent(input.id, input.updates);
        return await getAgentById(input.id);
      }),

    // Update agent emotional state
    updateEmotions: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          emotions: z.object({
            happiness: z.number().min(0).max(100).optional(),
            satisfaction: z.number().min(0).max(100).optional(),
            stress: z.number().min(0).max(100).optional(),
            loyalty: z.number().min(0).max(100).optional(),
            trust: z.number().min(0).max(100).optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const agent = await getAgentById(input.id);
        if (!agent) throw new Error("Agent not found");

        if (agent.companyId) {
          const company = await getCompanyByUserId(ctx.user.id);
          if (!company || agent.companyId !== company.id) {
            throw new Error("Not authorized");
          }
        }

        await updateAgentEmotionalState(input.id, input.emotions);
        return await getAgentById(input.id);
      }),

    // Get agent traits
    traits: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ input }) => {
        return await getAgentTraits(input.agentId);
      }),

    // Add trait to agent
    addTrait: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          traitId: z.number(),
          intensity: z.number().min(0).max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const agent = await getAgentById(input.agentId);
        if (!agent) throw new Error("Agent not found");

        if (agent.companyId) {
          const company = await getCompanyByUserId(ctx.user.id);
          if (!company || agent.companyId !== company.id) {
            throw new Error("Not authorized");
          }
        }

        await addTraitToAgent(input.agentId, input.traitId, input.intensity);
        return { success: true };
      }),

    // Get agent history
    history: protectedProcedure
      .input(z.object({ agentId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await getAgentHistory(input.agentId, input.limit);
      }),
  }),

  // Relationships
  relationship: router({
    // Create relationship
    create: protectedProcedure
      .input(
        z.object({
          agent1Id: z.number(),
          agent2Id: z.number(),
          type: z.enum(["business", "personal", "professional", "familial", "competitive"]),
        })
      )
      .mutation(async ({ input }) => {
        return await createRelationship({
          agent1Id: input.agent1Id,
          agent2Id: input.agent2Id,
          type: input.type,
        });
      }),

    // Get relationship between two agents
    between: protectedProcedure
      .input(z.object({ agent1Id: z.number(), agent2Id: z.number() }))
      .query(async ({ input }) => {
        return await getRelationshipBetweenAgents(input.agent1Id, input.agent2Id);
      }),

    // Get all relationships for an agent
    byAgent: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ input }) => {
        return await getAgentRelationships(input.agentId);
      }),

    // Record interaction
    recordInteraction: protectedProcedure
      .input(
        z.object({
          agent1Id: z.number(),
          agent2Id: z.number(),
          strengthChange: z.number().optional(),
          positivityChange: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await recordRelationshipInteraction(
          input.agent1Id,
          input.agent2Id,
          input.strengthChange,
          input.positivityChange
        );
        return { success: true };
      }),
  }),

  // Groups
  group: router({
    // Create group
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(128),
          type: z.enum(["department", "team", "union", "association", "club", "network"]),
          description: z.string().optional(),
          cityId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyByUserId(ctx.user.id);
        
        return await createAgentGroup({
          name: input.name,
          type: input.type,
          description: input.description,
          companyId: company?.id,
          cityId: input.cityId,
        });
      }),

    // Get group by ID
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getAgentGroupById(input.id);
      }),

    // Get groups by company
    byCompany: protectedProcedure.query(async ({ ctx }) => {
      const company = await getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await getAgentGroupsByCompany(company.id);
    }),

    // Get group members
    members: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await getGroupMembers(input.groupId);
      }),

    // Add agent to group
    addMember: protectedProcedure
      .input(
        z.object({
          groupId: z.number(),
          agentId: z.number(),
          role: z.enum(["leader", "core_member", "member", "associate"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        await addAgentToGroup({
          groupId: input.groupId,
          agentId: input.agentId,
          role: input.role || "member",
        });
        return { success: true };
      }),

    // Remove agent from group
    removeMember: protectedProcedure
      .input(z.object({ groupId: z.number(), agentId: z.number() }))
      .mutation(async ({ input }) => {
        await removeAgentFromGroup(input.groupId, input.agentId);
        return { success: true };
      }),
  }),

  // Communities
  community: router({
    // Create community
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(128),
          cityId: z.number(),
          type: z.enum(["residential", "business", "industrial", "cultural", "virtual"]),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createCommunity({
          name: input.name,
          cityId: input.cityId,
          type: input.type,
          description: input.description,
        });
      }),

    // Get community by ID
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getCommunityById(input.id);
      }),

    // Get communities by city
    byCity: protectedProcedure
      .input(z.object({ cityId: z.number() }))
      .query(async ({ input }) => {
        return await getCommunitiesByCity(input.cityId);
      }),

    // Get community members
    members: protectedProcedure
      .input(z.object({ communityId: z.number() }))
      .query(async ({ input }) => {
        return await getCommunityMembers(input.communityId);
      }),

    // Add agent to community
    addMember: protectedProcedure
      .input(z.object({ communityId: z.number(), agentId: z.number() }))
      .mutation(async ({ input }) => {
        await addAgentToCommunity({
          communityId: input.communityId,
          agentId: input.agentId,
        });
        return { success: true };
      }),
  }),

  // Events
  event: router({
    // Create event
    create: protectedProcedure
      .input(
        z.object({
          type: z.enum([
            "interaction",
            "transaction",
            "milestone",
            "crisis",
            "celebration",
            "conflict",
            "negotiation",
            "collaboration",
          ]),
          initiatorAgentId: z.number(),
          targetAgentId: z.number().optional(),
          title: z.string().min(2).max(256),
          description: z.string().optional(),
          scheduledAt: z.date(),
          duration: z.number().optional(),
          emotionalImpact: z.record(z.number()).optional(),
          relationshipImpact: z
            .object({
              agentIds: z.array(z.number()),
              strengthChange: z.number(),
              positivityChange: z.number(),
            })
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createAgentEvent({
          type: input.type,
          initiatorAgentId: input.initiatorAgentId,
          targetAgentId: input.targetAgentId,
          title: input.title,
          description: input.description,
          scheduledAt: input.scheduledAt,
          duration: input.duration,
          emotionalImpact: input.emotionalImpact,
          relationshipImpact: input.relationshipImpact,
        });
      }),

    // Get event by ID
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getAgentEventById(input.id);
      }),

    // Get events for an agent
    byAgent: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ input }) => {
        return await getAgentEvents(input.agentId);
      }),

    // Get scheduled events
    scheduled: protectedProcedure.query(async () => {
      return await getScheduledEvents();
    }),

    // Process/complete an event
    process: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input }) => {
        await processAgentEvent(input.eventId);
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
