import { pgTable, text, serial, integer, timestamp, date, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const splits = pgTable("splits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  numberOfDays: integer("number_of_days").notNull().default(1),
});

export const splitExercises = pgTable("split_exercises", {
  id: serial("id").primaryKey(),
  splitId: integer("split_id").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  dayNumber: integer("day_number").notNull().default(1),
  sets: integer("sets").notNull(),
  repMin: integer("rep_min").notNull(),
  repMax: integer("rep_max").notNull(),
  notes: text("notes"),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().defaultNow(),
  notes: text("notes"),
  splitId: integer("split_id"), // Optional - reference to which split was used
});

export const sets = pgTable("sets", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  setNumber: integer("set_number").notNull(),
  weight: integer("weight").notNull(),
  reps: integer("reps").notNull(),
  weightUnit: text("weight_unit").notNull().default("lbs"),
  exerciseNote: text("exercise_note"),
});

export const cardioTypes = pgTable("cardio_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(), // run, cycle, row, swim, other
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  defaultDistanceUnit: text("default_distance_unit").default("miles"), // miles, km, meters, yards
  showDistance: boolean("show_distance").notNull().default(true),
  showPace: boolean("show_pace").notNull().default(true),
  showSpeed: boolean("show_speed").notNull().default(false),
  paceUnit: text("pace_unit"), // min/mile, min/km, min/500m
  speedUnit: text("speed_unit"), // mph, km/h
});

export const cardioSessions = pgTable("cardio_sessions", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull(),
  cardioTypeId: integer("cardio_type_id").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  distance: real("distance"),
  distanceUnit: text("distance_unit"), // miles, km, meters, yards
  calories: integer("calories"),
  effortLevel: text("effort_level"), // easy, moderate, hard
  rpe: integer("rpe"), // 1-10 scale
  avgHeartRate: integer("avg_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  notes: text("notes"),
  isIntervals: boolean("is_intervals").notNull().default(false),
  workSeconds: integer("work_seconds"),
  restSeconds: integer("rest_seconds"),
  rounds: integer("rounds"),
  elevationGain: integer("elevation_gain"),
  incline: real("incline"),
  resistanceLevel: integer("resistance_level"),
  strokesPerMinute: integer("strokes_per_minute"),
  poolLength: text("pool_length"), // 25m, 50m, 25yd
  floorsClimbed: integer("floors_climbed"),
  totalSteps: integer("total_steps"),
  totalJumps: integer("total_jumps"),
});

export const splitCardio = pgTable("split_cardio", {
  id: serial("id").primaryKey(),
  splitId: integer("split_id").notNull(),
  cardioTypeId: integer("cardio_type_id").notNull(),
  dayNumber: integer("day_number").notNull().default(1),
  targetDurationSeconds: integer("target_duration_seconds"),
  targetDistance: real("target_distance"),
  targetDistanceUnit: text("target_distance_unit"),
  notes: text("notes"),
});

// === RELATIONS ===

export const splitRelations = relations(splits, ({ many }) => ({
  splitExercises: many(splitExercises),
  splitCardio: many(splitCardio),
  workouts: many(workouts),
}));

export const cardioTypeRelations = relations(cardioTypes, ({ many }) => ({
  cardioSessions: many(cardioSessions),
  splitCardio: many(splitCardio),
}));

export const cardioSessionRelations = relations(cardioSessions, ({ one }) => ({
  workout: one(workouts, {
    fields: [cardioSessions.workoutId],
    references: [workouts.id],
  }),
  cardioType: one(cardioTypes, {
    fields: [cardioSessions.cardioTypeId],
    references: [cardioTypes.id],
  }),
}));

export const splitCardioRelations = relations(splitCardio, ({ one }) => ({
  split: one(splits, {
    fields: [splitCardio.splitId],
    references: [splits.id],
  }),
  cardioType: one(cardioTypes, {
    fields: [splitCardio.cardioTypeId],
    references: [cardioTypes.id],
  }),
}));

export const splitExerciseRelations = relations(splitExercises, ({ one }) => ({
  split: one(splits, {
    fields: [splitExercises.splitId],
    references: [splits.id],
  }),
  exercise: one(exercises, {
    fields: [splitExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export const workoutRelations = relations(workouts, ({ many, one }) => ({
  sets: many(sets),
  cardioSessions: many(cardioSessions),
  split: one(splits, {
    fields: [workouts.splitId],
    references: [splits.id],
  }),
}));

export const exerciseRelations = relations(exercises, ({ many }) => ({
  sets: many(sets),
  splitExercises: many(splitExercises),
}));

export const setRelations = relations(sets, ({ one }) => ({
  workout: one(workouts, {
    fields: [sets.workoutId],
    references: [workouts.id],
  }),
  exercise: one(exercises, {
    fields: [sets.exerciseId],
    references: [exercises.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true });
export const insertSplitSchema = createInsertSchema(splits).omit({ id: true });
export const insertSplitExerciseSchema = createInsertSchema(splitExercises).omit({ id: true });
export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true });
export const insertSetSchema = createInsertSchema(sets).omit({ id: true });
export const insertCardioTypeSchema = createInsertSchema(cardioTypes).omit({ id: true });
export const insertCardioSessionSchema = createInsertSchema(cardioSessions).omit({ id: true });
export const insertSplitCardioSchema = createInsertSchema(splitCardio).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;

export type Split = typeof splits.$inferSelect;
export type InsertSplit = z.infer<typeof insertSplitSchema>;

export type SplitExercise = typeof splitExercises.$inferSelect;
export type InsertSplitExercise = z.infer<typeof insertSplitExerciseSchema>;
export type CreateSplitExerciseInput = Omit<InsertSplitExercise, 'splitId'>;

export type SplitWithExercises = Split & {
  splitExercises: (SplitExercise & { exercise: Exercise })[];
  splitCardio?: (SplitCardio & { cardioType: CardioType })[];
};

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;

export type Set = typeof sets.$inferSelect;
export type InsertSet = z.infer<typeof insertSetSchema>;

export type CardioType = typeof cardioTypes.$inferSelect;
export type InsertCardioType = z.infer<typeof insertCardioTypeSchema>;

export type CardioSession = typeof cardioSessions.$inferSelect;
export type InsertCardioSession = z.infer<typeof insertCardioSessionSchema>;

export type SplitCardio = typeof splitCardio.$inferSelect;
export type InsertSplitCardio = z.infer<typeof insertSplitCardioSchema>;
export type CreateSplitCardioInput = Omit<InsertSplitCardio, 'splitId'>;

// Cardio session input for API
export type CardioSessionInput = {
  cardioTypeId: number;
  durationSeconds: number;
  distance?: number;
  distanceUnit?: string;
  calories?: number;
  effortLevel?: string;
  rpe?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  notes?: string;
  isIntervals?: boolean;
  workSeconds?: number;
  restSeconds?: number;
  rounds?: number;
  elevationGain?: number;
  incline?: number;
  resistanceLevel?: number;
  strokesPerMinute?: number;
  poolLength?: string;
  floorsClimbed?: number;
  totalSteps?: number;
  totalJumps?: number;
};

// Complex types for the API
export type CreateWorkoutRequest = {
  date: string; // ISO string
  notes?: string;
  splitId?: number;
  sets: {
    exerciseId: number;
    setNumber: number;
    weight: number;
    reps: number;
    weightUnit?: string;
    exerciseNote?: string;
  }[];
  cardioSessions?: CardioSessionInput[];
};

export type UpdateWorkoutRequest = {
  notes?: string;
  sets: {
    id?: number; // existing set id, undefined for new sets
    exerciseId: number;
    setNumber: number;
    weight: number;
    reps: number;
    weightUnit?: string;
    exerciseNote?: string;
  }[];
  deletedSetIds?: number[];
  cardioSessions?: (CardioSessionInput & { id?: number })[];
  deletedCardioSessionIds?: number[];
};

export type WorkoutWithSets = Workout & {
  sets: (Set & { exercise: Exercise })[];
  cardioSessions?: (CardioSession & { cardioType: CardioType })[];
  split?: Split;
};

export type ExerciseStats = {
  date: string;
  maxWeight: number;
  maxWeightReps: number;
  maxWeightUnit: string;
  totalVolume: number;
};
