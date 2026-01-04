import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertExercise } from "@shared/routes";

// ============================================
// EXERCISE HOOKS
// ============================================

export function useExercises() {
  return useQuery({
    queryKey: [api.exercises.list.path],
    queryFn: async () => {
      const res = await fetch(api.exercises.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch exercises");
      return api.exercises.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertExercise) => {
      const validated = api.exercises.create.input.parse(data);
      const res = await fetch(api.exercises.create.path, {
        method: api.exercises.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Failed to create exercise");
        }
        throw new Error("Failed to create exercise");
      }
      return api.exercises.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.exercises.list.path] });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertExercise> }) => {
      const validated = api.exercises.update.input.parse(data);
      const res = await fetch(api.exercises.update.path.replace(':id', id.toString()), {
        method: api.exercises.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Failed to update exercise");
        }
        if (res.status === 404) {
          throw new Error("Exercise not found");
        }
        throw new Error("Failed to update exercise");
      }
      return api.exercises.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.exercises.list.path] });
    },
  });
}

// ============================================
// STATS HOOKS
// ============================================

export function useExerciseStats(exerciseId: number | null) {
  return useQuery({
    queryKey: [api.stats.get.path, exerciseId],
    enabled: !!exerciseId,
    queryFn: async () => {
      if (!exerciseId) return [];
      const url = buildUrl(api.stats.get.path, { exerciseId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.stats.get.responses[200].parse(await res.json());
    },
  });
}
