import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CardioType, InsertCardioType } from "@shared/schema";

export function useCardioTypes() {
  return useQuery<CardioType[]>({
    queryKey: ["/api/cardio-types"],
  });
}

export function useCreateCardioType() {
  return useMutation({
    mutationFn: async (data: InsertCardioType) => {
      const res = await apiRequest("POST", "/api/cardio-types", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cardio-types"] });
    },
  });
}

export function useUpdateCardioType() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCardioType> }) => {
      const res = await apiRequest("PATCH", `/api/cardio-types/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cardio-types"] });
    },
  });
}

export function useDeleteCardioType() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/cardio-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cardio-types"] });
    },
  });
}
