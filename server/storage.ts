import { db } from "./db";
import {
  exercises,
  splits,
  splitExercises,
  workouts,
  sets,
  cardioTypes,
  cardioSessions,
  splitCardio,
  type InsertExercise,
  type InsertSplit,
  type CreateSplitExerciseInput,
  type InsertWorkout,
  type InsertSet,
  type Exercise,
  type Split,
  type SplitWithExercises,
  type CreateWorkoutRequest,
  type UpdateWorkoutRequest,
  type WorkoutWithSets,
  type ExerciseStats,
  type CardioType,
  type InsertCardioType,
  type CardioSession,
  type CardioSessionInput,
  type CreateSplitCardioInput,
} from "@shared/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Exercises
  getExercises(): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise>;

  // Cardio Types
  getCardioTypes(): Promise<CardioType[]>;
  getCardioType(id: number): Promise<CardioType | undefined>;
  createCardioType(cardioType: InsertCardioType): Promise<CardioType>;
  updateCardioType(id: number, cardioType: Partial<InsertCardioType>): Promise<CardioType>;
  deleteCardioType(id: number): Promise<void>;
  seedBuiltInCardioTypes(): Promise<void>;

  // Splits
  getSplits(): Promise<SplitWithExercises[]>;
  getSplit(id: number): Promise<SplitWithExercises | undefined>;
  createSplit(req: { name: string; description?: string; numberOfDays?: number; splitExercises: CreateSplitExerciseInput[]; splitCardio?: CreateSplitCardioInput[] }): Promise<SplitWithExercises>;
  deleteSplit(id: number): Promise<void>;
  getSplitWorkouts(splitId: number): Promise<WorkoutWithSets[]>;

  // Workouts
  getWorkouts(): Promise<WorkoutWithSets[]>;
  getWorkout(id: number): Promise<WorkoutWithSets | undefined>;
  createWorkout(workout: CreateWorkoutRequest): Promise<WorkoutWithSets>;
  updateWorkout(id: number, update: UpdateWorkoutRequest): Promise<WorkoutWithSets>;
  deleteWorkout(id: number): Promise<void>;

  // Stats
  getExerciseStats(exerciseId: number): Promise<ExerciseStats[]>;

  // Export/Import
  exportAllData(): Promise<{
    exercises: Exercise[];
    cardioTypes: CardioType[];
    splits: any[];
    workouts: any[];
    exportedAt: string;
    version: string;
  }>;
  importAllData(data: {
    exercises?: any[];
    cardioTypes?: any[];
    splits?: any[];
    workouts?: any[];
  }): Promise<{ imported: { exercises: number; cardioTypes: number; splits: number; workouts: number } }>;
}

export class DatabaseStorage implements IStorage {
  async getExercises(): Promise<Exercise[]> {
    return await db.select().from(exercises).orderBy(exercises.name);
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [newExercise] = await db.insert(exercises).values(exercise).returning();
    return newExercise;
  }

  async updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise> {
    const [updated] = await db.update(exercises).set(exercise).where(eq(exercises.id, id)).returning();
    if (!updated) throw new Error('Exercise not found');
    return updated;
  }

  // Cardio Types
  async getCardioTypes(): Promise<CardioType[]> {
    return await db.select().from(cardioTypes).orderBy(cardioTypes.name);
  }

  async getCardioType(id: number): Promise<CardioType | undefined> {
    const [cardioType] = await db.select().from(cardioTypes).where(eq(cardioTypes.id, id));
    return cardioType;
  }

  async createCardioType(cardioType: InsertCardioType): Promise<CardioType> {
    const [newCardioType] = await db.insert(cardioTypes).values(cardioType).returning();
    return newCardioType;
  }

  async updateCardioType(id: number, cardioType: Partial<InsertCardioType>): Promise<CardioType> {
    const [updated] = await db.update(cardioTypes).set(cardioType).where(eq(cardioTypes.id, id)).returning();
    if (!updated) throw new Error('Cardio type not found');
    return updated;
  }

  async deleteCardioType(id: number): Promise<void> {
    await db.delete(cardioTypes).where(eq(cardioTypes.id, id));
  }

  async seedBuiltInCardioTypes(): Promise<void> {
    const builtInTypes: InsertCardioType[] = [
      { name: "Outdoor Run", category: "run", isBuiltIn: true, showDistance: true, showPace: true, showSpeed: false, paceUnit: "min/mile", defaultDistanceUnit: "miles" },
      { name: "Treadmill Run", category: "run", isBuiltIn: true, showDistance: true, showPace: true, showSpeed: false, paceUnit: "min/mile", defaultDistanceUnit: "miles" },
      { name: "Walk/Hike", category: "run", isBuiltIn: true, showDistance: true, showPace: true, showSpeed: false, paceUnit: "min/mile", defaultDistanceUnit: "miles" },
      { name: "Outdoor Cycling", category: "cycle", isBuiltIn: true, showDistance: true, showPace: false, showSpeed: true, speedUnit: "mph", defaultDistanceUnit: "miles" },
      { name: "Stationary Cycling", category: "cycle", isBuiltIn: true, showDistance: true, showPace: false, showSpeed: true, speedUnit: "mph", defaultDistanceUnit: "miles" },
      { name: "Rowing (Erg)", category: "row", isBuiltIn: true, showDistance: true, showPace: true, showSpeed: false, paceUnit: "min/500m", defaultDistanceUnit: "meters" },
      { name: "Elliptical", category: "other", isBuiltIn: true, showDistance: false, showPace: false, showSpeed: false },
      { name: "Stair Climber", category: "other", isBuiltIn: true, showDistance: false, showPace: false, showSpeed: false },
      { name: "Swimming", category: "swim", isBuiltIn: true, showDistance: true, showPace: true, showSpeed: false, paceUnit: "min/100m", defaultDistanceUnit: "meters" },
      { name: "Jump Rope", category: "other", isBuiltIn: true, showDistance: false, showPace: false, showSpeed: false },
      { name: "HIIT/Intervals", category: "other", isBuiltIn: true, showDistance: false, showPace: false, showSpeed: false },
      { name: "Other Cardio", category: "other", isBuiltIn: true, showDistance: true, showPace: false, showSpeed: false },
    ];

    for (const type of builtInTypes) {
      const existing = await db.select().from(cardioTypes).where(eq(cardioTypes.name, type.name));
      if (existing.length === 0) {
        await db.insert(cardioTypes).values(type);
      }
    }
  }

  async getSplits(): Promise<SplitWithExercises[]> {
    const allSplits = await db.select().from(splits).orderBy(splits.name);
    
    const result: SplitWithExercises[] = [];
    for (const split of allSplits) {
      const splitExs = await db.query.splitExercises.findMany({
        where: eq(splitExercises.splitId, split.id),
        with: {
          exercise: true
        }
      });
      const splitCardioItems = await db.query.splitCardio.findMany({
        where: eq(splitCardio.splitId, split.id),
        with: {
          cardioType: true
        }
      });
      result.push({ ...split, splitExercises: splitExs, splitCardio: splitCardioItems });
    }
    
    return result;
  }

  async getSplit(id: number): Promise<SplitWithExercises | undefined> {
    const [split] = await db.select().from(splits).where(eq(splits.id, id));
    if (!split) return undefined;

    const splitExs = await db.query.splitExercises.findMany({
      where: eq(splitExercises.splitId, split.id),
      with: {
        exercise: true
      }
    });
    const splitCardioItems = await db.query.splitCardio.findMany({
      where: eq(splitCardio.splitId, split.id),
      with: {
        cardioType: true
      }
    });

    return { ...split, splitExercises: splitExs, splitCardio: splitCardioItems };
  }

  async createSplit(req: { name: string; description?: string; numberOfDays?: number; splitExercises: CreateSplitExerciseInput[]; splitCardio?: CreateSplitCardioInput[] }): Promise<SplitWithExercises> {
    return await db.transaction(async (tx) => {
      const [newSplit] = await tx.insert(splits).values({
        name: req.name,
        description: req.description,
        numberOfDays: req.numberOfDays || 1,
      }).returning();

      if (req.splitExercises.length > 0) {
        await tx.insert(splitExercises).values(
          req.splitExercises.map(se => ({
            splitId: newSplit.id,
            exerciseId: se.exerciseId,
            dayNumber: se.dayNumber || 1,
            sets: se.sets,
            repMin: se.repMin,
            repMax: se.repMax,
            notes: se.notes,
          }))
        );
      }

      if (req.splitCardio && req.splitCardio.length > 0) {
        await tx.insert(splitCardio).values(
          req.splitCardio.map(sc => ({
            splitId: newSplit.id,
            cardioTypeId: sc.cardioTypeId,
            dayNumber: sc.dayNumber || 1,
            targetDurationSeconds: sc.targetDurationSeconds,
            targetDistance: sc.targetDistance,
            targetDistanceUnit: sc.targetDistanceUnit,
            notes: sc.notes,
          }))
        );
      }

      const splitExs = await tx.query.splitExercises.findMany({
        where: eq(splitExercises.splitId, newSplit.id),
        with: {
          exercise: true
        }
      });

      const splitCardioItems = await tx.query.splitCardio.findMany({
        where: eq(splitCardio.splitId, newSplit.id),
        with: {
          cardioType: true
        }
      });

      return { ...newSplit, splitExercises: splitExs, splitCardio: splitCardioItems };
    });
  }

  async deleteSplit(id: number): Promise<void> {
    await db.delete(splitExercises).where(eq(splitExercises.splitId, id));
    await db.delete(splitCardio).where(eq(splitCardio.splitId, id));
    await db.delete(splits).where(eq(splits.id, id));
  }

  async getSplitWorkouts(splitId: number): Promise<WorkoutWithSets[]> {
    const allWorkouts = await db.select().from(workouts).where(eq(workouts.splitId, splitId)).orderBy(desc(workouts.date));
    
    const result: WorkoutWithSets[] = [];
    for (const workout of allWorkouts) {
      const workoutSets = await db.query.sets.findMany({
        where: eq(sets.workoutId, workout.id),
        with: {
          exercise: true
        },
        orderBy: sets.setNumber
      });
      const workoutCardio = await db.query.cardioSessions.findMany({
        where: eq(cardioSessions.workoutId, workout.id),
        with: {
          cardioType: true
        }
      });
      result.push({ ...workout, sets: workoutSets, cardioSessions: workoutCardio });
    }
    
    return result;
  }

  async getWorkouts(): Promise<WorkoutWithSets[]> {
    const allWorkouts = await db.select().from(workouts).orderBy(desc(workouts.date));
    
    const result: WorkoutWithSets[] = [];
    
    for (const workout of allWorkouts) {
      const workoutSets = await db.query.sets.findMany({
        where: eq(sets.workoutId, workout.id),
        with: {
          exercise: true
        },
        orderBy: sets.setNumber
      });
      const workoutCardio = await db.query.cardioSessions.findMany({
        where: eq(cardioSessions.workoutId, workout.id),
        with: {
          cardioType: true
        }
      });
      result.push({ ...workout, sets: workoutSets, cardioSessions: workoutCardio });
    }
    
    return result;
  }

  async getWorkout(id: number): Promise<WorkoutWithSets | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    if (!workout) return undefined;

    const workoutSets = await db.query.sets.findMany({
      where: eq(sets.workoutId, workout.id),
      with: {
        exercise: true
      },
      orderBy: sets.setNumber
    });
    const workoutCardio = await db.query.cardioSessions.findMany({
      where: eq(cardioSessions.workoutId, workout.id),
      with: {
        cardioType: true
      }
    });

    return { ...workout, sets: workoutSets, cardioSessions: workoutCardio };
  }

  async createWorkout(req: CreateWorkoutRequest): Promise<WorkoutWithSets> {
    return await db.transaction(async (tx) => {
      const [newWorkout] = await tx.insert(workouts).values({
        date: new Date(req.date),
        notes: req.notes,
        splitId: req.splitId,
      }).returning();

      if (req.sets.length > 0) {
        await tx.insert(sets).values(
          req.sets.map(s => ({
            workoutId: newWorkout.id,
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            weightUnit: s.weightUnit || "lbs",
            exerciseNote: s.exerciseNote,
          }))
        );
      }

      if (req.cardioSessions && req.cardioSessions.length > 0) {
        await tx.insert(cardioSessions).values(
          req.cardioSessions.map(cs => ({
            workoutId: newWorkout.id,
            cardioTypeId: cs.cardioTypeId,
            durationSeconds: cs.durationSeconds,
            distance: cs.distance,
            distanceUnit: cs.distanceUnit,
            calories: cs.calories,
            effortLevel: cs.effortLevel,
            rpe: cs.rpe,
            avgHeartRate: cs.avgHeartRate,
            maxHeartRate: cs.maxHeartRate,
            notes: cs.notes,
            isIntervals: cs.isIntervals || false,
            workSeconds: cs.workSeconds,
            restSeconds: cs.restSeconds,
            rounds: cs.rounds,
            elevationGain: cs.elevationGain,
            incline: cs.incline,
            resistanceLevel: cs.resistanceLevel,
            strokesPerMinute: cs.strokesPerMinute,
            poolLength: cs.poolLength,
            floorsClimbed: cs.floorsClimbed,
            totalSteps: cs.totalSteps,
            totalJumps: cs.totalJumps,
          }))
        );
      }

      const workoutSets = await tx.query.sets.findMany({
        where: eq(sets.workoutId, newWorkout.id),
        with: {
          exercise: true
        },
        orderBy: sets.setNumber
      });

      const workoutCardio = await tx.query.cardioSessions.findMany({
        where: eq(cardioSessions.workoutId, newWorkout.id),
        with: {
          cardioType: true
        }
      });

      return { ...newWorkout, sets: workoutSets, cardioSessions: workoutCardio };
    });
  }

  async updateWorkout(id: number, update: UpdateWorkoutRequest): Promise<WorkoutWithSets> {
    return await db.transaction(async (tx) => {
      if (update.notes !== undefined) {
        await tx.update(workouts).set({ notes: update.notes }).where(eq(workouts.id, id));
      }

      if (update.deletedSetIds && update.deletedSetIds.length > 0) {
        await tx.delete(sets).where(inArray(sets.id, update.deletedSetIds));
      }

      if (update.deletedCardioSessionIds && update.deletedCardioSessionIds.length > 0) {
        await tx.delete(cardioSessions).where(inArray(cardioSessions.id, update.deletedCardioSessionIds));
      }

      for (const s of update.sets) {
        if (s.id) {
          await tx.update(sets).set({
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            weightUnit: s.weightUnit || "lbs",
            exerciseNote: s.exerciseNote,
          }).where(eq(sets.id, s.id));
        } else {
          await tx.insert(sets).values({
            workoutId: id,
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            weightUnit: s.weightUnit || "lbs",
            exerciseNote: s.exerciseNote,
          });
        }
      }

      if (update.cardioSessions) {
        for (const cs of update.cardioSessions) {
          if (cs.id) {
            await tx.update(cardioSessions).set({
              cardioTypeId: cs.cardioTypeId,
              durationSeconds: cs.durationSeconds,
              distance: cs.distance,
              distanceUnit: cs.distanceUnit,
              calories: cs.calories,
              effortLevel: cs.effortLevel,
              rpe: cs.rpe,
              avgHeartRate: cs.avgHeartRate,
              maxHeartRate: cs.maxHeartRate,
              notes: cs.notes,
              isIntervals: cs.isIntervals || false,
              workSeconds: cs.workSeconds,
              restSeconds: cs.restSeconds,
              rounds: cs.rounds,
              elevationGain: cs.elevationGain,
              incline: cs.incline,
              resistanceLevel: cs.resistanceLevel,
              strokesPerMinute: cs.strokesPerMinute,
              poolLength: cs.poolLength,
              floorsClimbed: cs.floorsClimbed,
              totalSteps: cs.totalSteps,
              totalJumps: cs.totalJumps,
            }).where(eq(cardioSessions.id, cs.id));
          } else {
            await tx.insert(cardioSessions).values({
              workoutId: id,
              cardioTypeId: cs.cardioTypeId,
              durationSeconds: cs.durationSeconds,
              distance: cs.distance,
              distanceUnit: cs.distanceUnit,
              calories: cs.calories,
              effortLevel: cs.effortLevel,
              rpe: cs.rpe,
              avgHeartRate: cs.avgHeartRate,
              maxHeartRate: cs.maxHeartRate,
              notes: cs.notes,
              isIntervals: cs.isIntervals || false,
              workSeconds: cs.workSeconds,
              restSeconds: cs.restSeconds,
              rounds: cs.rounds,
              elevationGain: cs.elevationGain,
              incline: cs.incline,
              resistanceLevel: cs.resistanceLevel,
              strokesPerMinute: cs.strokesPerMinute,
              poolLength: cs.poolLength,
              floorsClimbed: cs.floorsClimbed,
              totalSteps: cs.totalSteps,
              totalJumps: cs.totalJumps,
            });
          }
        }
      }

      const [workout] = await tx.select().from(workouts).where(eq(workouts.id, id));
      const workoutSets = await tx.query.sets.findMany({
        where: eq(sets.workoutId, id),
        with: { exercise: true },
        orderBy: sets.setNumber
      });
      const workoutCardio = await tx.query.cardioSessions.findMany({
        where: eq(cardioSessions.workoutId, id),
        with: { cardioType: true }
      });

      return { ...workout, sets: workoutSets, cardioSessions: workoutCardio };
    });
  }

  async deleteWorkout(id: number): Promise<void> {
    await db.delete(sets).where(eq(sets.workoutId, id));
    await db.delete(cardioSessions).where(eq(cardioSessions.workoutId, id));
    await db.delete(workouts).where(eq(workouts.id, id));
  }

  async getExerciseStats(exerciseId: number): Promise<ExerciseStats[]> {
    const result = await db
      .select({
        date: workouts.date,
        weight: sets.weight,
        reps: sets.reps,
        weightUnit: sets.weightUnit,
      })
      .from(sets)
      .innerJoin(workouts, eq(sets.workoutId, workouts.id))
      .where(eq(sets.exerciseId, exerciseId))
      .orderBy(workouts.date);

    const statsMap = new Map<string, { maxWeight: number; maxWeightReps: number; maxWeightUnit: string; totalVolume: number }>();

    for (const row of result) {
      const dateStr = row.date.toISOString().split('T')[0];
      const current = statsMap.get(dateStr) || { maxWeight: 0, maxWeightReps: 0, maxWeightUnit: "lbs", totalVolume: 0 };
      
      if (row.weight > current.maxWeight) {
        current.maxWeight = row.weight;
        current.maxWeightReps = row.reps;
        current.maxWeightUnit = row.weightUnit || "lbs";
      }
      current.totalVolume += row.weight * row.reps;
      
      statsMap.set(dateStr, current);
    }

    return Array.from(statsMap.entries()).map(([date, stat]) => ({
      date,
      maxWeight: stat.maxWeight,
      maxWeightReps: stat.maxWeightReps,
      maxWeightUnit: stat.maxWeightUnit,
      totalVolume: stat.totalVolume,
    }));
  }

  async exportAllData() {
    const allExercises = await db.select().from(exercises);
    const allCardioTypes = await db.select().from(cardioTypes);
    const allSplits = await db.select().from(splits);
    const allSplitExercises = await db.select().from(splitExercises);
    const allSplitCardio = await db.select().from(splitCardio);
    const allWorkouts = await db.select().from(workouts);
    const allSets = await db.select().from(sets);
    const allCardioSessions = await db.select().from(cardioSessions);

    const splitsWithDetails = allSplits.map(s => ({
      ...s,
      splitExercises: allSplitExercises.filter(se => se.splitId === s.id),
      splitCardio: allSplitCardio.filter(sc => sc.splitId === s.id),
    }));

    const workoutsWithDetails = allWorkouts.map(w => ({
      ...w,
      sets: allSets.filter(s => s.workoutId === w.id),
      cardioSessions: allCardioSessions.filter(cs => cs.workoutId === w.id),
    }));

    return {
      exercises: allExercises,
      cardioTypes: allCardioTypes.filter(ct => !ct.isBuiltIn),
      splits: splitsWithDetails,
      workouts: workoutsWithDetails,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
  }

  async importAllData(data: {
    exercises?: any[];
    cardioTypes?: any[];
    splits?: any[];
    workouts?: any[];
  }) {
    const imported = { exercises: 0, cardioTypes: 0, splits: 0, workouts: 0 };
    const exerciseIdMap = new Map<number, number>();
    const cardioTypeIdMap = new Map<number, number>();
    const splitIdMap = new Map<number, number>();

    return await db.transaction(async (tx) => {
      if (data.exercises && data.exercises.length > 0) {
        for (const ex of data.exercises) {
          const existing = await tx.select().from(exercises).where(eq(exercises.name, ex.name));
          if (existing.length > 0) {
            exerciseIdMap.set(ex.id, existing[0].id);
          } else {
            const [newEx] = await tx.insert(exercises).values({
              name: ex.name,
              description: ex.description,
            }).returning();
            exerciseIdMap.set(ex.id, newEx.id);
            imported.exercises++;
          }
        }
      }

      if (data.cardioTypes && data.cardioTypes.length > 0) {
        for (const ct of data.cardioTypes) {
          const existing = await tx.select().from(cardioTypes).where(eq(cardioTypes.name, ct.name));
          if (existing.length > 0) {
            cardioTypeIdMap.set(ct.id, existing[0].id);
          } else {
            const [newCt] = await tx.insert(cardioTypes).values({
              name: ct.name,
              category: ct.category,
              isBuiltIn: false,
              showDistance: ct.showDistance,
              showPace: ct.showPace,
              showSpeed: ct.showSpeed,
              paceUnit: ct.paceUnit,
              speedUnit: ct.speedUnit,
              defaultDistanceUnit: ct.defaultDistanceUnit,
            }).returning();
            cardioTypeIdMap.set(ct.id, newCt.id);
            imported.cardioTypes++;
          }
        }
      }

      if (data.splits && data.splits.length > 0) {
        for (const sp of data.splits) {
          const existing = await tx.select().from(splits).where(eq(splits.name, sp.name));
          if (existing.length > 0) {
            splitIdMap.set(sp.id, existing[0].id);
          } else {
            const [newSplit] = await tx.insert(splits).values({
              name: sp.name,
              description: sp.description,
              numberOfDays: sp.numberOfDays || 1,
            }).returning();
            splitIdMap.set(sp.id, newSplit.id);

            if (sp.splitExercises && sp.splitExercises.length > 0) {
              for (const se of sp.splitExercises) {
                const exerciseId = exerciseIdMap.get(se.exerciseId) || se.exerciseId;
                await tx.insert(splitExercises).values({
                  splitId: newSplit.id,
                  exerciseId,
                  dayNumber: se.dayNumber || 1,
                  sets: se.sets,
                  repMin: se.repMin,
                  repMax: se.repMax,
                  notes: se.notes,
                });
              }
            }

            if (sp.splitCardio && sp.splitCardio.length > 0) {
              for (const sc of sp.splitCardio) {
                const cardioTypeId = cardioTypeIdMap.get(sc.cardioTypeId) || sc.cardioTypeId;
                await tx.insert(splitCardio).values({
                  splitId: newSplit.id,
                  cardioTypeId,
                  dayNumber: sc.dayNumber || 1,
                  targetDurationSeconds: sc.targetDurationSeconds,
                  targetDistance: sc.targetDistance,
                  targetDistanceUnit: sc.targetDistanceUnit,
                  notes: sc.notes,
                });
              }
            }
            imported.splits++;
          }
        }
      }

      if (data.workouts && data.workouts.length > 0) {
        for (const w of data.workouts) {
          const [newWorkout] = await tx.insert(workouts).values({
            date: new Date(w.date),
            notes: w.notes,
            splitId: w.splitId ? (splitIdMap.get(w.splitId) || w.splitId) : null,
          }).returning();

          if (w.sets && w.sets.length > 0) {
            for (const s of w.sets) {
              const exerciseId = exerciseIdMap.get(s.exerciseId) || s.exerciseId;
              await tx.insert(sets).values({
                workoutId: newWorkout.id,
                exerciseId,
                setNumber: s.setNumber,
                weight: s.weight,
                reps: s.reps,
                weightUnit: s.weightUnit || "lbs",
                exerciseNote: s.exerciseNote,
              });
            }
          }

          if (w.cardioSessions && w.cardioSessions.length > 0) {
            for (const cs of w.cardioSessions) {
              const cardioTypeId = cardioTypeIdMap.get(cs.cardioTypeId) || cs.cardioTypeId;
              await tx.insert(cardioSessions).values({
                workoutId: newWorkout.id,
                cardioTypeId,
                durationSeconds: cs.durationSeconds,
                distance: cs.distance,
                distanceUnit: cs.distanceUnit,
                calories: cs.calories,
                effortLevel: cs.effortLevel,
                rpe: cs.rpe,
                avgHeartRate: cs.avgHeartRate,
                maxHeartRate: cs.maxHeartRate,
                notes: cs.notes,
                isIntervals: cs.isIntervals || false,
                workSeconds: cs.workSeconds,
                restSeconds: cs.restSeconds,
                rounds: cs.rounds,
                elevationGain: cs.elevationGain,
                incline: cs.incline,
                resistanceLevel: cs.resistanceLevel,
                strokesPerMinute: cs.strokesPerMinute,
                poolLength: cs.poolLength,
                floorsClimbed: cs.floorsClimbed,
                totalSteps: cs.totalSteps,
                totalJumps: cs.totalJumps,
              });
            }
          }
          imported.workouts++;
        }
      }

      return { imported };
    });
  }
}

export const storage = new DatabaseStorage();
