import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed built-in cardio types on startup
  await storage.seedBuiltInCardioTypes();
  
  // Exercises
  app.get(api.exercises.list.path, async (req, res) => {
    const exercises = await storage.getExercises();
    res.json(exercises);
  });

  app.post(api.exercises.create.path, async (req, res) => {
    try {
      const input = api.exercises.create.input.parse(req.body);
      const exercise = await storage.createExercise(input);
      res.status(201).json(exercise);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.exercises.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.exercises.update.input.parse(req.body);
      const exercise = await storage.updateExercise(id, input);
      res.json(exercise);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      if (err instanceof Error && err.message === 'Exercise not found') {
        return res.status(404).json({ message: 'Exercise not found' });
      }
      throw err;
    }
  });

  // Splits
  app.get(api.splits.list.path, async (req, res) => {
    const allSplits = await storage.getSplits();
    res.json(allSplits);
  });

  app.get(api.splits.get.path, async (req, res) => {
    const split = await storage.getSplit(Number(req.params.id));
    if (!split) {
      return res.status(404).json({ message: 'Split not found' });
    }
    res.json(split);
  });

  app.get(api.splits.workouts.list.path, async (req, res) => {
    try {
      const workouts = await storage.getSplitWorkouts(Number(req.params.id));
      res.json(workouts);
    } catch (err) {
      return res.status(404).json({ message: 'Split not found' });
    }
  });

  app.post(api.splits.create.path, async (req, res) => {
    try {
      const input = api.splits.create.input.parse(req.body);
      const split = await storage.createSplit(input);
      res.status(201).json(split);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.splits.delete.path, async (req, res) => {
    try {
      await storage.deleteSplit(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      return res.status(500).json({ message: 'Failed to delete split' });
    }
  });

  // Workouts
  app.get(api.workouts.list.path, async (req, res) => {
    const workouts = await storage.getWorkouts();
    res.json(workouts);
  });

  app.get(api.workouts.get.path, async (req, res) => {
    const workout = await storage.getWorkout(Number(req.params.id));
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    res.json(workout);
  });

  app.post(api.workouts.create.path, async (req, res) => {
    try {
      const input = api.workouts.create.input.parse(req.body);
      const workout = await storage.createWorkout(input);
      res.status(201).json(workout);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.workouts.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.workouts.update.input.parse(req.body);
      const workout = await storage.updateWorkout(id, input);
      res.json(workout);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.workouts.delete.path, async (req, res) => {
    try {
      await storage.deleteWorkout(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      return res.status(500).json({ message: 'Failed to delete workout' });
    }
  });

  // Stats
  app.get(api.stats.get.path, async (req, res) => {
    const stats = await storage.getExerciseStats(Number(req.params.exerciseId));
    res.json(stats);
  });

  // Cardio Types
  app.get(api.cardioTypes.list.path, async (req, res) => {
    const types = await storage.getCardioTypes();
    res.json(types);
  });

  app.post(api.cardioTypes.create.path, async (req, res) => {
    try {
      const input = api.cardioTypes.create.input.parse(req.body);
      const cardioType = await storage.createCardioType(input);
      res.status(201).json(cardioType);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.cardioTypes.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.cardioTypes.update.input.parse(req.body);
      const cardioType = await storage.updateCardioType(id, input);
      res.json(cardioType);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      if (err instanceof Error && err.message === 'Cardio type not found') {
        return res.status(404).json({ message: 'Cardio type not found' });
      }
      throw err;
    }
  });

  app.delete(api.cardioTypes.delete.path, async (req, res) => {
    try {
      await storage.deleteCardioType(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      return res.status(500).json({ message: 'Failed to delete cardio type' });
    }
  });

  // Data Export/Import
  app.get('/api/export', async (req, res) => {
    try {
      const data = await storage.exportAllData();
      res.setHeader('Content-Disposition', `attachment; filename="irontrack-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    } catch (err) {
      return res.status(500).json({ message: 'Failed to export data' });
    }
  });

  app.post('/api/import', async (req, res) => {
    try {
      const data = req.body;
      if (!data || (typeof data !== 'object')) {
        return res.status(400).json({ message: 'Invalid import data format' });
      }
      
      if (!data.version || !Array.isArray(data.exercises) || !Array.isArray(data.workouts) || !Array.isArray(data.splits)) {
        return res.status(400).json({ message: 'Invalid backup file structure. Expected version, exercises, workouts, and splits arrays.' });
      }
      
      if (data.version !== "1.0") {
        return res.status(400).json({ message: `Unsupported backup version: ${data.version}` });
      }
      
      const result = await storage.importAllData(data);
      res.json({ message: 'Import successful', ...result });
    } catch (err) {
      console.error('Import error:', err);
      return res.status(500).json({ message: 'Failed to import data. Please check the file format and try again.' });
    }
  });

  // Seed Data Endpoint (Hidden)
  app.post('/api/seed', async (req, res) => {
    try {
      const existing = await storage.getExercises();
      if (existing.length === 0) {
        const squat = await storage.createExercise({ name: "Squat" });
        const bench = await storage.createExercise({ name: "Bench Press" });
        const deadlift = await storage.createExercise({ name: "Deadlift" });
        
        // Add a split
        await storage.createSplit({
          name: "Upper/Lower",
          description: "Classic upper and lower body split",
          splitExercises: [
            { exerciseId: bench.id, dayNumber: 1, sets: 4, repMin: 6, repMax: 8, notes: "Heavy" },
            { exerciseId: squat.id, dayNumber: 2, sets: 4, repMin: 6, repMax: 8, notes: "Heavy" },
          ]
        });

        // Add a workout
        await storage.createWorkout({
          date: new Date().toISOString(),
          notes: "First workout!",
          sets: [
            { exerciseId: squat.id, setNumber: 1, weight: 135, reps: 5 },
            { exerciseId: squat.id, setNumber: 2, weight: 135, reps: 5 },
            { exerciseId: bench.id, setNumber: 1, weight: 95, reps: 8 },
          ]
        });
      }
      res.json({ message: "Seeded" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return httpServer;
}
