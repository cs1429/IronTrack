import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useSplits() {
  return useQuery({
    queryKey: [api.splits.list.path],
    queryFn: async () => {
      const res = await fetch(api.splits.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch splits");
      return api.splits.list.responses[200].parse(await res.json());
    },
  });
}

export function useSplit(id: number | null) {
  return useQuery({
    queryKey: [api.splits.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.splits.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch split");
      return api.splits.get.responses[200].parse(await res.json());
    },
  });
}

export function useSplitWorkouts(id: number | null) {
  return useQuery({
    queryKey: [api.splits.workouts.list.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return [];
      const url = buildUrl(api.splits.workouts.list.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed to fetch split workouts");
      return api.splits.workouts.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.splits.create.path, {
        method: api.splits.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create split");
      }
      return api.splits.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.splits.list.path] });
    },
  });
}

export function useDeleteSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.splits.delete.path, { id });
      const res = await fetch(url, {
        method: api.splits.delete.method,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete split");
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.splits.list.path] });
    },
  });
}
