import { useState } from "react";
import { Layout } from "@/components/layout";
import { useCreateWorkout } from "@/hooks/use-workouts";
import { useExercises, useCreateExercise } from "@/hooks/use-exercises";
import { useSplits } from "@/hooks/use-splits";
import { useCardioTypes } from "@/hooks/use-cardio";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Trash2, Save, Calendar as CalendarIcon, Loader2, Zap, Edit2, Heart, Timer, Route, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

type WorkoutSet = {
  id: string;
  exerciseId: number;
  exerciseName: string;
  weight: string;
  reps: string;
  setNumber: number;
  weightUnit: "lbs" | "kg";
  repMin?: number;
  repMax?: number;
};

type CardioSessionForm = {
  id: string;
  cardioTypeId: number;
  cardioTypeName: string;
  durationMinutes: string;
  durationSeconds: string;
  distance: string;
  distanceUnit: "miles" | "km" | "meters" | "yards";
  effortLevel: "easy" | "moderate" | "hard" | "";
  avgHeartRate: string;
  maxHeartRate: string;
  notes: string;
  isIntervals: boolean;
  workSeconds: string;
  restSeconds: string;
  rounds: string;
};

export default function LogWorkout() {
  const { toast } = useToast();
  const createWorkout = useCreateWorkout();
  const createExercise = useCreateExercise();
  const { data: exercises, isLoading: isLoadingExercises } = useExercises();
  const { data: splits } = useSplits();
  const { data: cardioTypes } = useCardioTypes();

  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [selectedSplitId, setSelectedSplitId] = useState<string>("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");

  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [isEditingWeights, setIsEditingWeights] = useState(false);

  const [isDaySelectOpen, setIsDaySelectOpen] = useState(false);
  const [pendingSplit, setPendingSplit] = useState<any>(null);

  // Cardio state
  const [cardioSessions, setCardioSessions] = useState<CardioSessionForm[]>([]);
  const [selectedCardioTypeId, setSelectedCardioTypeId] = useState<string>("");
  const [cardioDurationMinutes, setCardioDurationMinutes] = useState("");
  const [cardioDurationSeconds, setCardioDurationSeconds] = useState("");
  const [cardioDistance, setCardioDistance] = useState("");
  const [cardioDistanceUnit, setCardioDistanceUnit] = useState<"miles" | "km" | "meters" | "yards">("miles");
  const [cardioEffort, setCardioEffort] = useState<"easy" | "moderate" | "hard" | "">("");
  const [cardioAvgHR, setCardioAvgHR] = useState("");
  const [cardioMaxHR, setCardioMaxHR] = useState("");
  const [cardioNotes, setCardioNotes] = useState("");
  const [isCardioIntervals, setIsCardioIntervals] = useState(false);
  const [cardioWorkSeconds, setCardioWorkSeconds] = useState("");
  const [cardioRestSeconds, setCardioRestSeconds] = useState("");
  const [cardioRounds, setCardioRounds] = useState("");
  const [showCardioSection, setShowCardioSection] = useState(false);

  const handleSelectSplit = (split: any) => {
    const numDays = split.numberOfDays || 1;
    if (numDays > 1) {
      setPendingSplit(split);
      setIsDaySelectOpen(true);
    } else {
      handleUseSplit(split, 1);
    }
  };

  const handleUseSplit = (split: any, dayNumber: number) => {
    const dayExercises = split.splitExercises.filter((se: any) => 
      (se.dayNumber || 1) === dayNumber && se.exercise && se.exerciseId && se.exerciseId !== 0
    );

    const newSets: WorkoutSet[] = [];
    dayExercises.forEach((se: any) => {
      for (let i = 1; i <= se.sets; i++) {
        newSets.push({
          id: Math.random().toString(36).substr(2, 9),
          exerciseId: se.exerciseId,
          exerciseName: se.exercise.name,
          weight: "",
          reps: se.repMin.toString(),
          setNumber: i,
          weightUnit: "lbs",
          repMin: se.repMin,
          repMax: se.repMax,
        });
      }
    });

    if (newSets.length === 0) {
      toast({
        title: "No Exercises",
        description: `Day ${dayNumber} has no valid exercises.`,
        variant: "destructive",
      });
      return;
    }

    setSets(newSets);
    setSelectedSplitId(split.id.toString());
    setIsDaySelectOpen(false);
    setPendingSplit(null);
    toast({
      title: "Split Loaded",
      description: `${split.name} - Day ${dayNumber} loaded. Update weights and reps.`,
    });
  };

  const handleAddSet = () => {
    if (!selectedExerciseId || !weight || !reps) return;
    
    const exercise = exercises?.find(e => e.id === parseInt(selectedExerciseId));
    if (!exercise) return;

    const existingSetsForExercise = sets.filter(s => s.exerciseId === exercise.id);
    const nextSetNumber = existingSetsForExercise.length + 1;

    const newSet: WorkoutSet = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      weight: weight,
      reps: reps,
      setNumber: nextSetNumber,
      weightUnit: weightUnit,
    };

    setSets([...sets, newSet]);
    setWeight("");
    setReps("");
  };

  const handleRemoveSet = (id: string) => {
    setSets(sets.filter(s => s.id !== id));
  };

  const handleAddCardioSession = () => {
    if (!selectedCardioTypeId || (!cardioDurationMinutes && !cardioDurationSeconds)) {
      toast({
        title: "Missing Info",
        description: "Please select a cardio type and enter duration.",
        variant: "destructive",
      });
      return;
    }

    const cardioType = cardioTypes?.find(ct => ct.id === parseInt(selectedCardioTypeId));
    if (!cardioType) return;

    const newSession: CardioSessionForm = {
      id: Math.random().toString(36).substr(2, 9),
      cardioTypeId: cardioType.id,
      cardioTypeName: cardioType.name,
      durationMinutes: cardioDurationMinutes || "0",
      durationSeconds: cardioDurationSeconds || "0",
      distance: cardioDistance,
      distanceUnit: cardioDistanceUnit,
      effortLevel: cardioEffort,
      avgHeartRate: cardioAvgHR,
      maxHeartRate: cardioMaxHR,
      notes: cardioNotes,
      isIntervals: isCardioIntervals,
      workSeconds: cardioWorkSeconds,
      restSeconds: cardioRestSeconds,
      rounds: cardioRounds,
    };

    setCardioSessions([...cardioSessions, newSession]);
    
    // Reset form
    setSelectedCardioTypeId("");
    setCardioDurationMinutes("");
    setCardioDurationSeconds("");
    setCardioDistance("");
    setCardioEffort("");
    setCardioAvgHR("");
    setCardioMaxHR("");
    setCardioNotes("");
    setIsCardioIntervals(false);
    setCardioWorkSeconds("");
    setCardioRestSeconds("");
    setCardioRounds("");
    
    toast({
      title: "Cardio Added",
      description: `${cardioType.name} session added to your workout.`,
    });
  };

  const handleRemoveCardioSession = (id: string) => {
    setCardioSessions(cardioSessions.filter(s => s.id !== id));
  };

  const formatDuration = (minutes: string, seconds: string) => {
    const min = parseInt(minutes) || 0;
    const sec = parseInt(seconds) || 0;
    if (min === 0 && sec === 0) return "0:00";
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) return;
    
    try {
      const newEx = await createExercise.mutateAsync({ 
        name: newExerciseName,
        description: newExerciseDescription || undefined
      });
      setIsExerciseDialogOpen(false);
      setNewExerciseName("");
      setNewExerciseDescription("");
      setSelectedExerciseId(newEx.id.toString());
      toast({
        title: "Exercise Created",
        description: `${newEx.name} has been added to your library.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create exercise. It might already exist.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitWorkout = async () => {
    if (sets.length === 0 && cardioSessions.length === 0) {
      toast({
        title: "Empty Workout",
        description: "Add at least one set or cardio session before saving.",
        variant: "destructive",
      });
      return;
    }

    const hasEmptyWeights = sets.some(s => !s.weight || s.weight === "0" || s.weight === "");
    if (sets.length > 0 && hasEmptyWeights) {
      toast({
        title: "Missing Weights",
        description: "Please fill in all weight values before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createWorkout.mutateAsync({
        date: date.toISOString(),
        notes,
        splitId: selectedSplitId ? Number(selectedSplitId) : undefined,
        sets: sets.map(s => ({
          exerciseId: s.exerciseId,
          setNumber: s.setNumber,
          weight: parseInt(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
          weightUnit: s.weightUnit,
        })),
        cardioSessions: cardioSessions.map(cs => ({
          cardioTypeId: cs.cardioTypeId,
          durationSeconds: (parseInt(cs.durationMinutes) || 0) * 60 + (parseInt(cs.durationSeconds) || 0),
          distance: cs.distance ? parseFloat(cs.distance) : undefined,
          distanceUnit: cs.distance ? cs.distanceUnit : undefined,
          effortLevel: cs.effortLevel || undefined,
          avgHeartRate: cs.avgHeartRate ? parseInt(cs.avgHeartRate) : undefined,
          maxHeartRate: cs.maxHeartRate ? parseInt(cs.maxHeartRate) : undefined,
          notes: cs.notes || undefined,
          isIntervals: cs.isIntervals || undefined,
          workSeconds: cs.isIntervals && cs.workSeconds ? parseInt(cs.workSeconds) : undefined,
          restSeconds: cs.isIntervals && cs.restSeconds ? parseInt(cs.restSeconds) : undefined,
          rounds: cs.isIntervals && cs.rounds ? parseInt(cs.rounds) : undefined,
        })),
      });
      
      toast({
        title: "Workout Logged!",
        description: "Your session has been saved successfully.",
      });

      setSets([]);
      setCardioSessions([]);
      setNotes("");
      setWeight("");
      setReps("");
      setDate(new Date());
      setSelectedSplitId("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save workout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWeightChange = (id: string, value: string) => {
    const cleanValue = value.replace(/^0+/, '') || '';
    const updated = sets.map(s => s.id === id ? { ...s, weight: cleanValue } : s);
    setSets(updated);
  };

  const handleRepsChange = (id: string, value: string) => {
    const cleanValue = value.replace(/^0+/, '') || '';
    const updated = sets.map(s => s.id === id ? { ...s, reps: cleanValue } : s);
    setSets(updated);
  };

  const handleUnitToggle = (id: string) => {
    const updated = sets.map(s => 
      s.id === id ? { ...s, weightUnit: s.weightUnit === "lbs" ? "kg" as const : "lbs" as const } : s
    );
    setSets(updated);
  };

  const isRepsBelowMin = (set: WorkoutSet) => {
    if (!set.repMin) return false;
    const repsNum = parseInt(set.reps) || 0;
    return repsNum < set.repMin;
  };

  const isWeightEmpty = (set: WorkoutSet) => {
    return !set.weight || set.weight === "" || set.weight === "0";
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display">Log Workout</h2>
            <p className="text-muted-foreground mt-1">Record your sets, reps, and weights.</p>
          </div>
          
          <button
            onClick={handleSubmitWorkout}
            disabled={createWorkout.isPending || (sets.length === 0 && cardioSessions.length === 0)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none transition-all"
            data-testid="button-save-workout"
          >
            {createWorkout.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Workout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            
            {splits && splits.length > 0 && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Quick Load Split
                  </h4>
                  {sets.length > 0 && selectedSplitId && (
                    <button
                      onClick={() => setIsEditingWeights(!isEditingWeights)}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                      data-testid="button-toggle-edit"
                    >
                      <Edit2 className="w-3 h-3" />
                      {isEditingWeights ? "Done" : "Edit Weights"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {splits.map((split: any) => (
                    <button
                      key={split.id}
                      onClick={() => handleSelectSplit(split)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedSplitId === split.id.toString()
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                      data-testid={`button-split-${split.id}`}
                    >
                      {split.name}
                      {(split.numberOfDays || 1) > 1 && (
                        <span className="ml-1 text-xs opacity-70">({split.numberOfDays}d)</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Dialog open={isDaySelectOpen} onOpenChange={setIsDaySelectOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Training Day</DialogTitle>
                  <DialogDescription>
                    {pendingSplit?.name} has {pendingSplit?.numberOfDays} days. Which day are you training?
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-4 gap-3 py-4">
                  {pendingSplit && Array.from({ length: pendingSplit.numberOfDays || 1 }, (_, i) => i + 1).map((day) => {
                    const dayExercises = pendingSplit.splitExercises.filter((se: any) => 
                      (se.dayNumber || 1) === day && se.exercise && se.exerciseId
                    );
                    return (
                      <button
                        key={day}
                        onClick={() => handleUseSplit(pendingSplit, day)}
                        className="flex flex-col items-center p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                        data-testid={`button-select-day-${day}`}
                      >
                        <span className="text-2xl font-bold text-primary">{day}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {dayExercises.length} exercise{dayExercises.length !== 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <DialogFooter>
                  <button
                    onClick={() => { setIsDaySelectOpen(false); setPendingSplit(null); }}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center justify-start text-left font-normal px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors",
                          !date && "text-muted-foreground"
                        )}
                        data-testid="button-date-picker"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Session Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did the workout feel? Energy levels, injuries, etc."
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none h-24"
                  data-testid="input-notes"
                />
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg font-display">Add Set</h3>
                
                <Dialog open={isExerciseDialogOpen} onOpenChange={setIsExerciseDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> New Exercise
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Exercise</DialogTitle>
                      <DialogDescription>
                        Add a new exercise to your library to start tracking it.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Exercise Name</label>
                        <input
                          value={newExerciseName}
                          onChange={(e) => setNewExerciseName(e.target.value)}
                          placeholder="e.g. Bulgarian Split Squat"
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          data-testid="input-new-exercise-name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                        <textarea
                          value={newExerciseDescription}
                          onChange={(e) => setNewExerciseDescription(e.target.value)}
                          placeholder="e.g. Single leg squat variation"
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-20"
                          data-testid="input-new-exercise-description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
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

              <div className="space-y-4 mb-4">
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Exercise</label>
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                    data-testid="select-exercise"
                  >
                    <option value="" disabled>Select exercise...</option>
                    {exercises?.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Weight</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value.replace(/^0+/, '') || '')}
                        placeholder="0"
                        className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        data-testid="input-weight"
                      />
                      <button
                        type="button"
                        onClick={() => setWeightUnit(weightUnit === "lbs" ? "kg" : "lbs")}
                        className="px-3 py-3 rounded-xl border border-border bg-muted text-sm font-medium hover:bg-muted/80 transition-colors shrink-0"
                        data-testid="button-unit-toggle"
                      >
                        {weightUnit}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Reps</label>
                    <input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      data-testid="input-reps"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddSet}
                disabled={!selectedExerciseId || !weight || !reps}
                className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                data-testid="button-add-set"
              >
                <Plus className="w-5 h-5" /> Add Set
              </button>
            </div>

            {/* Add Cardio Section */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <button
                onClick={() => setShowCardioSection(!showCardioSection)}
                className="w-full flex items-center justify-between"
                data-testid="button-toggle-cardio"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg font-display">Add Cardio</h3>
                </div>
                <span className="text-sm text-muted-foreground">
                  {showCardioSection ? "Hide" : "Show"}
                </span>
              </button>

              {showCardioSection && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Cardio Type</label>
                    <select
                      value={selectedCardioTypeId}
                      onChange={(e) => setSelectedCardioTypeId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                      data-testid="select-cardio-type"
                    >
                      <option value="" disabled>Select cardio type...</option>
                      {cardioTypes?.map((ct) => (
                        <option key={ct.id} value={ct.id}>{ct.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
                      <Timer className="w-3 h-3 inline-block mr-1" />
                      Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          value={cardioDurationMinutes}
                          onChange={(e) => setCardioDurationMinutes(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          data-testid="input-cardio-duration-min"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">min</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={cardioDurationSeconds}
                          onChange={(e) => setCardioDurationSeconds(e.target.value)}
                          placeholder="0"
                          max="59"
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          data-testid="input-cardio-duration-sec"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">sec</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
                      <Route className="w-3 h-3 inline-block mr-1" />
                      Distance (optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={cardioDistance}
                        onChange={(e) => setCardioDistance(e.target.value)}
                        placeholder="0"
                        className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        data-testid="input-cardio-distance"
                      />
                      <select
                        value={cardioDistanceUnit}
                        onChange={(e) => setCardioDistanceUnit(e.target.value as any)}
                        className="px-3 py-3 rounded-xl border border-border bg-muted text-sm font-medium appearance-none"
                        data-testid="select-cardio-distance-unit"
                      >
                        <option value="miles">mi</option>
                        <option value="km">km</option>
                        <option value="meters">m</option>
                        <option value="yards">yd</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
                      <Activity className="w-3 h-3 inline-block mr-1" />
                      Effort Level (optional)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["easy", "moderate", "hard"] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setCardioEffort(cardioEffort === level ? "" : level)}
                          className={cn(
                            "py-2 rounded-lg font-medium text-sm capitalize transition-colors",
                            cardioEffort === level
                              ? level === "easy" ? "bg-green-500/20 text-green-600 border-2 border-green-500"
                              : level === "moderate" ? "bg-yellow-500/20 text-yellow-600 border-2 border-yellow-500"
                              : "bg-red-500/20 text-red-600 border-2 border-red-500"
                              : "bg-muted border-2 border-transparent hover:bg-muted/80"
                          )}
                          data-testid={`button-effort-${level}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
                        <Heart className="w-3 h-3 inline-block mr-1" />
                        Avg HR (optional)
                      </label>
                      <input
                        type="number"
                        value={cardioAvgHR}
                        onChange={(e) => setCardioAvgHR(e.target.value)}
                        placeholder="bpm"
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        data-testid="input-cardio-avg-hr"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Max HR (optional)</label>
                      <input
                        type="number"
                        value={cardioMaxHR}
                        onChange={(e) => setCardioMaxHR(e.target.value)}
                        placeholder="bpm"
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        data-testid="input-cardio-max-hr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Notes (optional)</label>
                    <input
                      type="text"
                      value={cardioNotes}
                      onChange={(e) => setCardioNotes(e.target.value)}
                      placeholder="Any notes about this session..."
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      data-testid="input-cardio-notes"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCardioIntervals}
                        onChange={(e) => setIsCardioIntervals(e.target.checked)}
                        className="w-4 h-4 rounded"
                        data-testid="checkbox-intervals"
                      />
                      <span className="text-sm font-medium">Interval Training</span>
                    </label>
                  </div>

                  {isCardioIntervals && (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Work (sec)</label>
                        <input
                          type="number"
                          value={cardioWorkSeconds}
                          onChange={(e) => setCardioWorkSeconds(e.target.value)}
                          placeholder="30"
                          className="w-full px-2 py-2 rounded-md border border-border bg-background text-sm"
                          data-testid="input-interval-work"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Rest (sec)</label>
                        <input
                          type="number"
                          value={cardioRestSeconds}
                          onChange={(e) => setCardioRestSeconds(e.target.value)}
                          placeholder="10"
                          className="w-full px-2 py-2 rounded-md border border-border bg-background text-sm"
                          data-testid="input-interval-rest"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Rounds</label>
                        <input
                          type="number"
                          value={cardioRounds}
                          onChange={(e) => setCardioRounds(e.target.value)}
                          placeholder="10"
                          className="w-full px-2 py-2 rounded-md border border-border bg-background text-sm"
                          data-testid="input-interval-rounds"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleAddCardioSession}
                    disabled={!selectedCardioTypeId || (!cardioDurationMinutes && !cardioDurationSeconds)}
                    className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    data-testid="button-add-cardio"
                  >
                    <Plus className="w-5 h-5" /> Add Cardio Session
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden h-fit sticky top-24">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold font-display">Session Overview</h3>
              <p className="text-sm text-muted-foreground">
                {sets.length} sets{cardioSessions.length > 0 && `, ${cardioSessions.length} cardio`}
              </p>
            </div>
            
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {sets.length === 0 && cardioSessions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No sets or cardio added yet.</p>
                </div>
              ) : (
                <>
                {/* Cardio Sessions */}
                {cardioSessions.map((session) => (
                  <div key={session.id} className="p-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground text-sm flex items-center gap-1">
                          <Heart className="w-3 h-3 text-primary" />
                          {session.cardioTypeName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono font-medium text-foreground">
                            {formatDuration(session.durationMinutes, session.durationSeconds)}
                          </span>
                          {session.distance && (
                            <span className="ml-2 font-mono">
                              {session.distance} {session.distanceUnit}
                            </span>
                          )}
                          {session.effortLevel && (
                            <span className={cn(
                              "ml-2 capitalize",
                              session.effortLevel === "easy" ? "text-green-500" :
                              session.effortLevel === "moderate" ? "text-yellow-500" : "text-red-500"
                            )}>
                              {session.effortLevel}
                            </span>
                          )}
                          {session.isIntervals && (
                            <span className="ml-2 text-primary">Intervals</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCardioSession(session.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded hover:bg-destructive/10"
                        data-testid={`button-remove-cardio-${session.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                </>
              )}
              {sets.length > 0 && (
                sets.map((set) => (
                  <div key={set.id} className="p-3 hover:bg-muted/30 transition-colors group">
                    {isEditingWeights ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">{set.exerciseName}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground block mb-1">Weight</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={set.weight}
                                onChange={(e) => handleWeightChange(set.id, e.target.value)}
                                placeholder="0"
                                className={cn(
                                  "flex-1 px-2 py-1 rounded border bg-background text-xs",
                                  isWeightEmpty(set) ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-border"
                                )}
                                data-testid={`input-edit-weight-${set.id}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleUnitToggle(set.id)}
                                className="px-2 py-1 rounded border border-border bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
                                data-testid={`button-edit-unit-${set.id}`}
                              >
                                {set.weightUnit}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Reps</label>
                            <input
                              type="number"
                              value={set.reps}
                              onChange={(e) => handleRepsChange(set.id, e.target.value)}
                              className={cn(
                                "w-full px-2 py-1 rounded border bg-background text-xs",
                                isRepsBelowMin(set) ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "border-border"
                              )}
                              data-testid={`input-edit-reps-${set.id}`}
                            />
                          </div>
                        </div>
                        {isRepsBelowMin(set) && (
                          <p className="text-xs text-red-500">Below target range ({set.repMin}-{set.repMax})</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground text-sm">{set.exerciseName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Set {set.setNumber}:{" "}
                            <span className={cn(
                              "font-mono font-medium",
                              isWeightEmpty(set) ? "text-red-500" : "text-foreground"
                            )}>
                              {set.weight || "0"}{set.weightUnit}
                            </span>
                            {" × "}
                            <span className={cn(
                              "font-mono font-medium",
                              isRepsBelowMin(set) ? "text-red-500" : "text-foreground"
                            )}>
                              {set.reps}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveSet(set.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded hover:bg-destructive/10"
                          data-testid={`button-remove-set-${set.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {sets.length > 0 && (
              <div className="p-4 bg-muted/30 border-t border-border">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span>Total Volume</span>
                  <span className="font-mono">
                    {sets.reduce((acc, s) => acc + ((parseInt(s.weight) || 0) * (parseInt(s.reps) || 0)), 0).toLocaleString()} mixed
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
