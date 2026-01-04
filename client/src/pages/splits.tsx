import { useState } from "react";
import { Layout } from "@/components/layout";
import { useSplits, useCreateSplit, useDeleteSplit, useSplitWorkouts } from "@/hooks/use-splits";
import { useExercises, useCreateExercise, useUpdateExercise } from "@/hooks/use-exercises";
import { useCardioTypes, useCreateCardioType, useUpdateCardioType, useDeleteCardioType } from "@/hooks/use-cardio";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, Activity, Edit2, ChevronRight, ChevronLeft, Heart } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

type DayExerciseForm = {
  exerciseId: number;
  sets: number;
  repMin: number;
  repMax: number;
  notes: string;
};

type DayConfig = {
  dayNumber: number;
  exercises: DayExerciseForm[];
};

export default function Splits() {
  const { toast } = useToast();
  const { data: splits, isLoading: isLoadingSplits } = useSplits();
  const { data: exercises, isLoading: isLoadingExercises } = useExercises();
  const { data: cardioTypes, isLoading: isLoadingCardioTypes } = useCardioTypes();
  const createSplit = useCreateSplit();
  const deleteSplit = useDeleteSplit();
  const createCardioType = useCreateCardioType();
  const updateCardioType = useUpdateCardioType();
  const deleteCardioType = useDeleteCardioType();

  const [activeTab, setActiveTab] = useState<"splits" | "exercises" | "cardio">("splits");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSplitId, setEditingSplitId] = useState<number | null>(null);
  const [expandedSplits, setExpandedSplits] = useState<Set<number>>(new Set());
  
  // Multi-step wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [splitName, setSplitName] = useState("");
  const [splitDescription, setSplitDescription] = useState("");
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [dayConfigs, setDayConfigs] = useState<DayConfig[]>([{ dayNumber: 1, exercises: [] }]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  
  // Exercise List State
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editExerciseName, setEditExerciseName] = useState("");
  const [editExerciseDescription, setEditExerciseDescription] = useState("");
  const [isEditExerciseDialogOpen, setIsEditExerciseDialogOpen] = useState(false);

  // Cardio List State
  const [newCardioTypeName, setNewCardioTypeName] = useState("");
  const [newCardioTypeCategory, setNewCardioTypeCategory] = useState("other");
  const [isCardioDialogOpen, setIsCardioDialogOpen] = useState(false);
  const [editingCardioTypeId, setEditingCardioTypeId] = useState<number | null>(null);
  const [editCardioTypeName, setEditCardioTypeName] = useState("");
  const [isEditCardioDialogOpen, setIsEditCardioDialogOpen] = useState(false);

  const resetWizard = () => {
    setWizardStep(1);
    setSplitName("");
    setSplitDescription("");
    setNumberOfDays(1);
    setDayConfigs([{ dayNumber: 1, exercises: [] }]);
    setCurrentDayIndex(0);
    setEditingSplitId(null);
  };

  const handleNumberOfDaysChange = (days: number) => {
    const validDays = Math.max(1, Math.min(14, days));
    setNumberOfDays(validDays);
    
    const newConfigs: DayConfig[] = [];
    for (let i = 0; i < validDays; i++) {
      if (dayConfigs[i]) {
        newConfigs.push(dayConfigs[i]);
      } else {
        newConfigs.push({ dayNumber: i + 1, exercises: [] });
      }
    }
    setDayConfigs(newConfigs);
    if (currentDayIndex >= validDays) {
      setCurrentDayIndex(validDays - 1);
    }
  };

  const handleAddExerciseToDay = () => {
    const updated = [...dayConfigs];
    updated[currentDayIndex].exercises.push({
      exerciseId: 0,
      sets: 3,
      repMin: 8,
      repMax: 12,
      notes: ""
    });
    setDayConfigs(updated);
  };

  const handleRemoveExerciseFromDay = (exerciseIndex: number) => {
    const updated = [...dayConfigs];
    updated[currentDayIndex].exercises = updated[currentDayIndex].exercises.filter((_, i) => i !== exerciseIndex);
    setDayConfigs(updated);
  };

  const handleUpdateDayExercise = (exerciseIndex: number, field: string, value: any) => {
    const updated = [...dayConfigs];
    updated[currentDayIndex].exercises[exerciseIndex] = {
      ...updated[currentDayIndex].exercises[exerciseIndex],
      [field]: value
    };
    setDayConfigs(updated);
  };

  const getTotalSteps = () => 2 + numberOfDays;

  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (!splitName.trim()) {
        toast({ title: "Error", description: "Split name is required.", variant: "destructive" });
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardStep(3);
      setCurrentDayIndex(0);
    } else if (wizardStep >= 3 && currentDayIndex < numberOfDays - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    } else {
      handleCreateSplit();
    }
  };

  const handlePrevStep = () => {
    if (wizardStep === 3 && currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    } else if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
      if (wizardStep === 3) {
        setCurrentDayIndex(0);
      }
    }
  };

  const handleCreateSplit = async () => {
    const allExercises = dayConfigs.flatMap((day, idx) =>
      day.exercises
        .filter(ex => ex.exerciseId !== 0)
        .map(ex => ({
          exerciseId: Number(ex.exerciseId),
          dayNumber: idx + 1,
          sets: Number(ex.sets),
          repMin: Number(ex.repMin),
          repMax: Number(ex.repMax),
          notes: ex.notes || undefined,
        }))
    );

    const hasUnselectedExercises = dayConfigs.some(day => 
      day.exercises.some(ex => ex.exerciseId === 0)
    );

    if (hasUnselectedExercises) {
      toast({ title: "Error", description: "Please select an exercise for each row or remove empty rows.", variant: "destructive" });
      return;
    }

    if (allExercises.length === 0) {
      toast({ title: "Error", description: "Add at least one exercise to your split.", variant: "destructive" });
      return;
    }

    try {
      if (editingSplitId) {
        await deleteSplit.mutateAsync(editingSplitId);
      }
      
      await createSplit.mutateAsync({
        name: splitName,
        description: splitDescription,
        numberOfDays,
        splitExercises: allExercises,
      });

      toast({
        title: editingSplitId ? "Split Updated" : "Split Created",
        description: `${splitName} has been saved.`,
      });

      setIsDialogOpen(false);
      resetWizard();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save split. Please try again.", variant: "destructive" });
    }
  };

  const handleDeleteSplit = async (id: number) => {
    try {
      await deleteSplit.mutateAsync(id);
      toast({ title: "Deleted", description: "Split has been removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete split.", variant: "destructive" });
    }
  };

  const handleEditSplit = (split: any) => {
    setEditingSplitId(split.id);
    setSplitName(split.name);
    setSplitDescription(split.description || "");
    
    const numDays = split.numberOfDays || 1;
    setNumberOfDays(numDays);
    
    const configs: DayConfig[] = [];
    for (let i = 1; i <= numDays; i++) {
      const dayExercises = split.splitExercises
        .filter((se: any) => (se.dayNumber || 1) === i)
        .map((se: any) => ({
          exerciseId: se.exerciseId,
          sets: se.sets,
          repMin: se.repMin,
          repMax: se.repMax,
          notes: se.notes || "",
        }));
      configs.push({ dayNumber: i, exercises: dayExercises });
    }
    setDayConfigs(configs);
    setCurrentDayIndex(0);
    setWizardStep(1);
    setIsDialogOpen(true);
  };

  const toggleExpand = (id: number) => {
    const newSet = new Set(expandedSplits);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSplits(newSet);
  };

  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) {
      toast({ title: "Error", description: "Exercise name is required.", variant: "destructive" });
      return;
    }

    try {
      await createExercise.mutateAsync({
        name: newExerciseName,
        description: newExerciseDescription || undefined,
      });
      toast({ title: "Exercise Created", description: `${newExerciseName} has been added to your library.` });
      setIsExerciseDialogOpen(false);
      setNewExerciseName("");
      setNewExerciseDescription("");
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to create exercise.", variant: "destructive" });
    }
  };

  const handleEditExercise = (exercise: any) => {
    setEditingExerciseId(exercise.id);
    setEditExerciseName(exercise.name);
    setEditExerciseDescription(exercise.description || "");
    setIsEditExerciseDialogOpen(true);
  };

  const handleSaveExercise = async () => {
    if (!editExerciseName.trim() || !editingExerciseId) {
      toast({ title: "Error", description: "Exercise name is required.", variant: "destructive" });
      return;
    }

    try {
      await updateExercise.mutateAsync({
        id: editingExerciseId,
        data: { name: editExerciseName, description: editExerciseDescription || undefined },
      });
      toast({ title: "Exercise Updated", description: `${editExerciseName} has been updated.` });
      setIsEditExerciseDialogOpen(false);
      setEditingExerciseId(null);
      setEditExerciseName("");
      setEditExerciseDescription("");
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update exercise.", variant: "destructive" });
    }
  };

  const handleCreateCardioType = async () => {
    if (!newCardioTypeName.trim()) {
      toast({ title: "Error", description: "Cardio type name is required.", variant: "destructive" });
      return;
    }

    try {
      await createCardioType.mutateAsync({
        name: newCardioTypeName,
        category: newCardioTypeCategory,
        isBuiltIn: false,
      });
      toast({ title: "Cardio Type Created", description: `${newCardioTypeName} has been added.` });
      setIsCardioDialogOpen(false);
      setNewCardioTypeName("");
      setNewCardioTypeCategory("other");
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to create cardio type.", variant: "destructive" });
    }
  };

  const handleEditCardioType = (cardioType: any) => {
    setEditingCardioTypeId(cardioType.id);
    setEditCardioTypeName(cardioType.name);
    setIsEditCardioDialogOpen(true);
  };

  const handleSaveCardioType = async () => {
    if (!editCardioTypeName.trim() || !editingCardioTypeId) {
      toast({ title: "Error", description: "Cardio type name is required.", variant: "destructive" });
      return;
    }

    try {
      await updateCardioType.mutateAsync({
        id: editingCardioTypeId,
        data: { name: editCardioTypeName },
      });
      toast({ title: "Cardio Type Updated", description: `${editCardioTypeName} has been updated.` });
      setIsEditCardioDialogOpen(false);
      setEditingCardioTypeId(null);
      setEditCardioTypeName("");
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update cardio type.", variant: "destructive" });
    }
  };

  const handleDeleteCardioType = async (id: number) => {
    try {
      await deleteCardioType.mutateAsync(id);
      toast({ title: "Deleted", description: "Custom cardio type has been removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete cardio type.", variant: "destructive" });
    }
  };

  const renderWizardStep = () => {
    if (wizardStep === 1) {
      return (
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Split Name</label>
            <input
              value={splitName}
              onChange={(e) => setSplitName(e.target.value)}
              placeholder="e.g. Push/Pull/Legs"
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              data-testid="input-split-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
            <textarea
              value={splitDescription}
              onChange={(e) => setSplitDescription(e.target.value)}
              placeholder="e.g. 3-day training split for strength"
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-20"
              data-testid="input-split-description"
            />
          </div>
        </div>
      );
    }

    if (wizardStep === 2) {
      return (
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Number of Days</label>
            <p className="text-xs text-muted-foreground mb-3">How many training days are in this split?</p>
            <input
              type="number"
              min="1"
              max="14"
              value={numberOfDays}
              onChange={(e) => handleNumberOfDaysChange(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              data-testid="input-number-of-days"
            />
          </div>
          <div className="grid grid-cols-7 gap-2 mt-4">
            {Array.from({ length: numberOfDays }, (_, i) => (
              <div
                key={i}
                className="aspect-square flex items-center justify-center rounded-lg bg-primary/10 text-primary font-medium text-sm"
              >
                D{i + 1}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold">Day {currentDayIndex + 1} of {numberOfDays}</h4>
            <p className="text-xs text-muted-foreground">Add exercises for this training day</p>
          </div>
          <button
            onClick={handleAddExerciseToDay}
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
            data-testid="button-add-day-exercise"
          >
            <Plus className="w-3 h-3" /> Add Exercise
          </button>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {dayConfigs[currentDayIndex]?.exercises.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground text-sm">No exercises added for Day {currentDayIndex + 1}</p>
              <button
                onClick={handleAddExerciseToDay}
                className="mt-2 text-sm text-primary font-medium hover:underline"
              >
                Add your first exercise
              </button>
            </div>
          ) : (
            dayConfigs[currentDayIndex]?.exercises.map((ex, idx) => (
              <div key={idx} className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1 space-y-2">
                  <select
                    value={ex.exerciseId}
                    onChange={(e) => handleUpdateDayExercise(idx, "exerciseId", Number(e.target.value))}
                    className="w-full px-2 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid={`select-exercise-${idx}`}
                  >
                    <option value={0}>Select exercise...</option>
                    {exercises?.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Sets</label>
                      <input
                        type="number"
                        min="1"
                        value={ex.sets}
                        onChange={(e) => handleUpdateDayExercise(idx, "sets", Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm"
                        data-testid={`input-sets-${idx}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Min Reps</label>
                      <input
                        type="number"
                        min="1"
                        value={ex.repMin}
                        onChange={(e) => handleUpdateDayExercise(idx, "repMin", Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm"
                        data-testid={`input-repmin-${idx}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Max Reps</label>
                      <input
                        type="number"
                        min="1"
                        value={ex.repMax}
                        onChange={(e) => handleUpdateDayExercise(idx, "repMax", Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm"
                        data-testid={`input-repmax-${idx}`}
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={ex.notes}
                    onChange={(e) => handleUpdateDayExercise(idx, "notes", e.target.value)}
                    placeholder="Notes (e.g., Heavy)"
                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm"
                    data-testid={`input-notes-${idx}`}
                  />
                </div>
                <button
                  onClick={() => handleRemoveExerciseFromDay(idx)}
                  className="text-muted-foreground hover:text-destructive p-2"
                  data-testid={`button-remove-exercise-${idx}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {numberOfDays > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
            {Array.from({ length: numberOfDays }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentDayIndex(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  i === currentDayIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                data-testid={`button-day-${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getStepTitle = () => {
    if (wizardStep === 1) return "Step 1: Split Basics";
    if (wizardStep === 2) return "Step 2: Number of Days";
    return `Step 3: Day ${currentDayIndex + 1} Exercises`;
  };

  const isLastStep = wizardStep >= 3 && currentDayIndex === numberOfDays - 1;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display">Workout Splits</h2>
          <p className="text-muted-foreground mt-1">Create and manage your training splits and exercises.</p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "splits" | "exercises" | "cardio")} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="splits" data-testid="tab-splits">Splits</TabsTrigger>
            <TabsTrigger value="exercises" data-testid="tab-exercises">Exercise List</TabsTrigger>
            <TabsTrigger value="cardio" data-testid="tab-cardio">Cardio List</TabsTrigger>
          </TabsList>

          <TabsContent value="splits" className="space-y-6 mt-6">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetWizard();
            }}>
              <DialogTrigger asChild>
                <button
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
                  data-testid="button-new-split"
                >
                  <Plus className="w-5 h-5" />
                  New Split
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSplitId ? "Edit Split" : getStepTitle()}</DialogTitle>
                  <DialogDescription>
                    {wizardStep === 1 && "Give your split a name and optional description."}
                    {wizardStep === 2 && "Choose how many training days are in your split."}
                    {wizardStep >= 3 && "Add exercises for each training day."}
                  </DialogDescription>
                </DialogHeader>

                {renderWizardStep()}

                <DialogFooter className="flex items-center justify-between gap-2">
                  <div>
                    {wizardStep > 1 && (
                      <button
                        onClick={handlePrevStep}
                        className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1"
                        data-testid="button-prev-step"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsDialogOpen(false)}
                      className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleNextStep}
                      disabled={createSplit.isPending}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                      data-testid="button-next-step"
                    >
                      {createSplit.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : isLastStep ? (
                        editingSplitId ? "Update Split" : "Create Split"
                      ) : (
                        <>
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {isLoadingSplits ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : splits && splits.length > 0 ? (
              <div className="space-y-3">
                {splits.map((split: any) => (
                  <div key={split.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    <div
                      onClick={() => toggleExpand(split.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{split.name}</h3>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {split.numberOfDays || 1} day{(split.numberOfDays || 1) > 1 ? "s" : ""}
                          </span>
                        </div>
                        {split.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{split.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {split.splitExercises.filter((s: any) => s.exerciseId && s.exerciseId !== 0).length} exercises total
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditSplit(split); }}
                          className="text-muted-foreground hover:text-primary p-2 transition-colors"
                          data-testid={`button-edit-split-${split.id}`}
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSplit(split.id); }}
                          className="text-muted-foreground hover:text-destructive p-2 transition-colors"
                          data-testid={`button-delete-split-${split.id}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {expandedSplits.has(split.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                    {expandedSplits.has(split.id) && <SplitDetails split={split} />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <h3 className="text-lg font-medium">No splits yet</h3>
                <p className="text-muted-foreground mb-6">Create your first split to organize your training.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="exercises" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Your Exercises</h3>
                <p className="text-sm text-muted-foreground mt-1">Create and manage exercises to use in your splits and workouts.</p>
              </div>
              <Dialog open={isExerciseDialogOpen} onOpenChange={setIsExerciseDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
                    data-testid="button-add-exercise"
                  >
                    <Plus className="w-5 h-5" />
                    Add Exercise
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Exercise</DialogTitle>
                    <DialogDescription>Add a new exercise to your library with an optional description.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Exercise Name</label>
                      <input
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        placeholder="e.g. Barbell Squat"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-new-exercise-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                      <textarea
                        value={newExerciseDescription}
                        onChange={(e) => setNewExerciseDescription(e.target.value)}
                        placeholder="e.g. Compound leg exercise"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-24"
                        data-testid="input-new-exercise-description"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <button
                      onClick={() => setIsExerciseDialogOpen(false)}
                      className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateExercise}
                      disabled={createExercise.isPending || !newExerciseName}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                      data-testid="button-create-exercise"
                    >
                      {createExercise.isPending ? "Creating..." : "Create Exercise"}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingExercises ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : exercises && exercises.length > 0 ? (
              <div className="grid gap-3">
                {exercises.map((exercise) => (
                  <div key={exercise.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{exercise.name}</h4>
                      {exercise.description && (
                        <p className="text-sm text-muted-foreground mt-2">{exercise.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleEditExercise(exercise)}
                      className="text-muted-foreground hover:text-primary p-2 transition-colors ml-2"
                      data-testid={`button-edit-exercise-${exercise.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <h3 className="text-lg font-medium">No exercises yet</h3>
                <p className="text-muted-foreground mb-6">Create your first exercise to get started.</p>
              </div>
            )}

            <Dialog open={isEditExerciseDialogOpen} onOpenChange={setIsEditExerciseDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Exercise</DialogTitle>
                  <DialogDescription>Update the exercise name and description.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Exercise Name</label>
                    <input
                      value={editExerciseName}
                      onChange={(e) => setEditExerciseName(e.target.value)}
                      placeholder="e.g. Barbell Squat"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      data-testid="input-edit-exercise-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                    <textarea
                      value={editExerciseDescription}
                      onChange={(e) => setEditExerciseDescription(e.target.value)}
                      placeholder="e.g. Compound leg exercise"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-24"
                      data-testid="input-edit-exercise-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button
                    onClick={() => setIsEditExerciseDialogOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveExercise}
                    disabled={updateExercise.isPending || !editExerciseName}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                    data-testid="button-save-exercise"
                  >
                    {updateExercise.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="cardio" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Cardio Activities</h3>
                <p className="text-sm text-muted-foreground mt-1">Built-in and custom cardio types for your workouts.</p>
              </div>
              <Dialog open={isCardioDialogOpen} onOpenChange={setIsCardioDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
                    data-testid="button-add-cardio-type"
                  >
                    <Plus className="w-5 h-5" />
                    Add Custom Cardio
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Custom Cardio Type</DialogTitle>
                    <DialogDescription>Add a custom cardio activity not in the built-in list.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Cardio Type Name</label>
                      <input
                        value={newCardioTypeName}
                        onChange={(e) => setNewCardioTypeName(e.target.value)}
                        placeholder="e.g. Battle Ropes"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="input-new-cardio-type-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <select
                        value={newCardioTypeCategory}
                        onChange={(e) => setNewCardioTypeCategory(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        data-testid="select-new-cardio-type-category"
                      >
                        <option value="running">Running</option>
                        <option value="cycling">Cycling</option>
                        <option value="swimming">Swimming</option>
                        <option value="rowing">Rowing</option>
                        <option value="walking">Walking</option>
                        <option value="hiit">HIIT</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <button
                      onClick={() => setIsCardioDialogOpen(false)}
                      className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCardioType}
                      disabled={createCardioType.isPending || !newCardioTypeName}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                      data-testid="button-create-cardio-type"
                    >
                      {createCardioType.isPending ? "Creating..." : "Create Cardio Type"}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingCardioTypes ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : cardioTypes && cardioTypes.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Built-in Activities</h4>
                  <div className="grid gap-2">
                    {cardioTypes.filter(ct => ct.isBuiltIn).map((cardioType) => (
                      <div key={cardioType.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Heart className="w-5 h-5 text-primary" />
                          <span className="font-medium">{cardioType.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Built-in</span>
                      </div>
                    ))}
                  </div>
                </div>

                {cardioTypes.filter(ct => !ct.isBuiltIn).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Custom Activities</h4>
                    <div className="grid gap-2">
                      {cardioTypes.filter(ct => !ct.isBuiltIn).map((cardioType) => (
                        <div key={cardioType.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Heart className="w-5 h-5 text-primary" />
                            <span className="font-medium">{cardioType.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCardioType(cardioType)}
                              className="text-muted-foreground hover:text-primary p-2 transition-colors"
                              data-testid={`button-edit-cardio-type-${cardioType.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCardioType(cardioType.id)}
                              className="text-muted-foreground hover:text-destructive p-2 transition-colors"
                              data-testid={`button-delete-cardio-type-${cardioType.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <h3 className="text-lg font-medium">No cardio types available</h3>
                <p className="text-muted-foreground mb-6">Built-in cardio types will be loaded automatically.</p>
              </div>
            )}

            <Dialog open={isEditCardioDialogOpen} onOpenChange={setIsEditCardioDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Cardio Type</DialogTitle>
                  <DialogDescription>Update the cardio type name.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Cardio Type Name</label>
                    <input
                      value={editCardioTypeName}
                      onChange={(e) => setEditCardioTypeName(e.target.value)}
                      placeholder="e.g. Battle Ropes"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      data-testid="input-edit-cardio-type-name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button
                    onClick={() => setIsEditCardioDialogOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCardioType}
                    disabled={updateCardioType.isPending || !editCardioTypeName}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                    data-testid="button-save-cardio-type"
                  >
                    {updateCardioType.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function SplitDetails({ split }: { split: any }) {
  const { data: workouts, isLoading } = useSplitWorkouts(split.id);
  const numDays = split.numberOfDays || 1;

  const exercisesByDay: Record<number, any[]> = {};
  for (let i = 1; i <= numDays; i++) {
    exercisesByDay[i] = split.splitExercises.filter((se: any) => (se.dayNumber || 1) === i);
  }

  return (
    <div className="border-t border-border p-4 bg-muted/20 space-y-4">
      {Array.from({ length: numDays }, (_, i) => i + 1).map((day) => (
        <div key={day}>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
              {day}
            </span>
            Day {day}
          </h4>
          <div className="space-y-2 ml-8">
            {exercisesByDay[day]?.length > 0 ? (
              exercisesByDay[day].map((se: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-background/50 rounded">
                  <div>
                    <span className="font-medium">{se.exercise?.name || "Unknown Exercise"}</span>
                    <span className="text-muted-foreground ml-2">
                      {se.sets} x {se.repMin}-{se.repMax} reps
                    </span>
                    {se.notes && <span className="text-muted-foreground ml-2">({se.notes})</span>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No exercises for this day</p>
            )}
          </div>
        </div>
      ))}

      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Recent Workouts
        </h4>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : workouts && workouts.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {workouts.slice(0, 5).map((workout: any) => (
              <div key={workout.id} className="flex items-center justify-between text-sm p-2 bg-background/50 rounded">
                <span>{format(new Date(workout.date), "PPP")}</span>
                <span className="text-muted-foreground">{workout.sets?.length || 0} sets</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No workouts logged with this split yet</p>
        )}
      </div>
    </div>
  );
}
