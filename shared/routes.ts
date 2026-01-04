import { z } from 'zod';
import { insertExerciseSchema, insertSplitSchema, insertSplitExerciseSchema, insertWorkoutSchema, insertSetSchema, insertCardioTypeSchema, exercises, splits, splitExercises, workouts, sets, cardioTypes } from './schema';

// Cardio session input schema for API
const cardioSessionInputSchema = z.object({
  cardioTypeId: z.number(),
  durationSeconds: z.number().min(1),
  distance: z.number().optional(),
  distanceUnit: z.string().optional(),
  calories: z.number().optional(),
  effortLevel: z.enum(["easy", "moderate", "hard"]).optional(),
  rpe: z.number().min(1).max(10).optional(),
  avgHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  notes: z.string().optional(),
  isIntervals: z.boolean().optional(),
  workSeconds: z.number().optional(),
  restSeconds: z.number().optional(),
  rounds: z.number().optional(),
  elevationGain: z.number().optional(),
  incline: z.number().optional(),
  resistanceLevel: z.number().optional(),
  strokesPerMinute: z.number().optional(),
  poolLength: z.string().optional(),
  floorsClimbed: z.number().optional(),
  totalSteps: z.number().optional(),
  totalJumps: z.number().optional(),
});

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  exercises: {
    list: {
      method: 'GET' as const,
      path: '/api/exercises',
      responses: {
        200: z.array(z.custom<typeof exercises.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/exercises',
      input: insertExerciseSchema,
      responses: {
        201: z.custom<typeof exercises.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/exercises/:id',
      input: insertExerciseSchema.partial(),
      responses: {
        200: z.custom<typeof exercises.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  splits: {
    list: {
      method: 'GET' as const,
      path: '/api/splits',
      responses: {
        200: z.array(z.custom<any>()), // Returns SplitWithExercises[]
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/splits',
      input: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        numberOfDays: z.number().min(1).default(1),
        splitExercises: z.array(z.object({
          exerciseId: z.number(),
          dayNumber: z.number().min(1).default(1),
          sets: z.number(),
          repMin: z.number(),
          repMax: z.number(),
          notes: z.string().optional(),
        })),
        splitCardio: z.array(z.object({
          cardioTypeId: z.number(),
          dayNumber: z.number().min(1).default(1),
          targetDurationSeconds: z.number().optional(),
          targetDistance: z.number().optional(),
          targetDistanceUnit: z.string().optional(),
          notes: z.string().optional(),
        })).optional(),
      }),
      responses: {
        201: z.custom<any>(), // Returns SplitWithExercises
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/splits/:id',
      responses: {
        200: z.custom<any>(), // Returns SplitWithExercises
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/splits/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    workouts: {
      list: {
        method: 'GET' as const,
        path: '/api/splits/:id/workouts',
        responses: {
          200: z.array(z.custom<any>()), // Returns WorkoutWithSets[]
          404: errorSchemas.notFound,
        },
      },
    },
  },
  workouts: {
    list: {
      method: 'GET' as const,
      path: '/api/workouts',
      responses: {
        200: z.array(z.custom<any>()), // Returns WorkoutWithSets[]
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/workouts',
      input: z.object({
        date: z.string(), // ISO date string
        notes: z.string().optional(),
        splitId: z.number().optional(),
        sets: z.array(z.object({
          exerciseId: z.number(),
          setNumber: z.number(),
          weight: z.number(),
          reps: z.number(),
          weightUnit: z.enum(["lbs", "kg"]).default("lbs"),
        })),
        cardioSessions: z.array(cardioSessionInputSchema).optional(),
      }),
      responses: {
        201: z.custom<any>(), // Returns WorkoutWithSets
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/workouts/:id',
      responses: {
        200: z.custom<any>(), // Returns WorkoutWithSets
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/workouts/:id',
      input: z.object({
        notes: z.string().optional(),
        sets: z.array(z.object({
          id: z.number().optional(),
          exerciseId: z.number(),
          setNumber: z.number(),
          weight: z.number(),
          reps: z.number(),
          weightUnit: z.enum(["lbs", "kg"]).default("lbs"),
          exerciseNote: z.string().optional(),
        })),
        deletedSetIds: z.array(z.number()).optional(),
        cardioSessions: z.array(cardioSessionInputSchema.extend({ id: z.number().optional() })).optional(),
        deletedCardioSessionIds: z.array(z.number()).optional(),
      }),
      responses: {
        200: z.custom<any>(), // Returns WorkoutWithSets
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/workouts/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats/:exerciseId',
      responses: {
        200: z.array(z.object({
          date: z.string(),
          maxWeight: z.number(),
          maxWeightReps: z.number(),
          maxWeightUnit: z.string(),
          totalVolume: z.number(),
        })),
        404: errorSchemas.notFound,
      },
    },
  },
  cardioTypes: {
    list: {
      method: 'GET' as const,
      path: '/api/cardio-types',
      responses: {
        200: z.array(z.custom<typeof cardioTypes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/cardio-types',
      input: insertCardioTypeSchema,
      responses: {
        201: z.custom<typeof cardioTypes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/cardio-types/:id',
      input: insertCardioTypeSchema.partial(),
      responses: {
        200: z.custom<typeof cardioTypes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/cardio-types/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

// ============================================
// REQUIRED: buildUrl helper
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
