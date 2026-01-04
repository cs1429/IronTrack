import { Layout } from "@/components/layout";
import { StatCard } from "@/components/ui/card-stats";
import { useWorkouts, useUpdateWorkout, useDeleteWorkout } from "@/hooks/use-workouts";
import { useExercises } from "@/hooks/use-exercises";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { 
  Activity, 
  CalendarDays, 
  Trophy, 
  TrendingUp,
  ChevronRight,
  Dumbbell,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  X,
  Edit2
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutWithSets, Set, Exercise } from "@shared/schema";

type ExerciseGroup = {
  exerciseId: number;
  exerciseName: string;
  exerciseNote: string;
  sets: {
    id: number;
    setNumber: number;
    weight: number;
    reps: number;
    weightUnit: string;
  }[];
};

function groupSetsByExercise(workout: WorkoutWithSets): ExerciseGroup[] {
  const groups: Map<number, ExerciseGroup> = new Map();
  
  for (const set of workout.sets) {
    const existing = groups.get(set.exerciseId);
    if (existing) {
      existing.sets.push({
        id: set.id,
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        weightUnit: set.weightUnit || "lbs",
      });
      if (set.exerciseNote && !existing.exerciseNote) {
        existing.exerciseNote = set.exerciseNote;
      }
    } else {
      groups.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        exerciseName: set.exercise?.name || "Unknown Exercise",
        exerciseNote: set.exerciseNote || "",
        sets: [{
          id: set.id,
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          weightUnit: set.weightUnit || "lbs",
        }],
      });
    }
  }
  
  return Array.from(groups.values());
}

export default function Dashboard() {
  const { data: workouts, isLoading } = useWorkouts();
  const { data: allExercises } = useExercises();
  const updateWorkout = useUpdateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<"week" | "day">("day");
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithSets | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const [editedGroups, setEditedGroups] = useState<ExerciseGroup[]>([]);
  const [deletedSetIds, setDeletedSetIds] = useState<number[]>([]);
  const [newSetCounter, setNewSetCounter] = useState(-1);

  useEffect(() => {
    if (selectedWorkout) {
      setEditedNotes(selectedWorkout.notes || "");
      setEditedGroups(groupSetsByExercise(selectedWorkout));
      setDeletedSetIds([]);
      setNewSetCounter(-1);
    }
  }, [selectedWorkout]);

  const totalWorkouts = workouts?.length || 0;
  
  const currentWeekStart = startOfWeek(new Date());
  const currentWeekEnd = endOfWeek(new Date());
  const thisWeekWorkouts = workouts?.filter((w: WorkoutWithSets) => 
    isWithinInterval(new Date(w.date), { start: currentWeekStart, end: currentWeekEnd })
  ) || [];
  const thisWeekVolume = thisWeekWorkouts.reduce((acc: number, w: WorkoutWithSets) => 
    acc + w.sets.reduce((s: number, set: Set) => s + (set.weight * set.reps), 0), 0
  );

  const recentWorkouts = workouts?.slice(0, 5) || [];
  const latestWorkout = workouts?.[0];
  const lastSessionVolume = latestWorkout?.sets.reduce((acc: number, set: Set) => acc + (set.weight * set.reps), 0) || 0;
  
  const distinctExercises = new Set(
    workouts?.flatMap((w: WorkoutWithSets) => w.sets.map((s: Set) => s.exerciseId))
  ).size;

  const handleOpenWorkout = (workout: WorkoutWithSets) => {
    setSelectedWorkout(workout);
    setIsEditing(false);
  };

  const handleCloseDrawer = () => {
    setSelectedWorkout(null);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (selectedWorkout) {
      setEditedNotes(selectedWorkout.notes || "");
      setEditedGroups(groupSetsByExercise(selectedWorkout));
      setDeletedSetIds([]);
    }
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedWorkout) return;

    const hasInvalidSets = editedGroups.some(group => 
      group.sets.some(set => set.weight < 0 || set.reps <= 0)
    );

    if (hasInvalidSets) {
      toast({ title: "Validation Error", description: "All sets must have positive reps and non-negative weight.", variant: "destructive" });
      return;
    }

    if (editedGroups.length === 0) {
      toast({ title: "Validation Error", description: "Workout must have at least one exercise.", variant: "destructive" });
      return;
    }

    const allSets = editedGroups.flatMap((group, groupIdx) =>
      group.sets.map((set, setIdx) => ({
        id: set.id > 0 ? set.id : undefined,
        exerciseId: group.exerciseId,
        setNumber: setIdx + 1,
        weight: set.weight,
        reps: set.reps,
        weightUnit: set.weightUnit,
        exerciseNote: group.exerciseNote || undefined,
      }))
    );

    try {
      await updateWorkout.mutateAsync({
        id: selectedWorkout.id,
        data: {
          notes: editedNotes,
          sets: allSets,
          deletedSetIds: deletedSetIds.filter(id => id > 0),
        },
      });
      toast({ title: "Workout Updated", description: "Your changes have been saved." });
      setIsEditing(false);
      handleCloseDrawer();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update workout. Please try again.", variant: "destructive" });
    }
  };

  const handleDeleteWorkout = async () => {
    if (!selectedWorkout) return;
    try {
      await deleteWorkout.mutateAsync(selectedWorkout.id);
      toast({ title: "Workout Deleted", description: "The workout has been removed." });
      handleCloseDrawer();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete workout.", variant: "destructive" });
    }
  };

  const handleUpdateSetValue = (groupIdx: number, setIdx: number, field: "weight" | "reps", value: number) => {
    const updated = [...editedGroups];
    updated[groupIdx].sets[setIdx][field] = value;
    setEditedGroups(updated);
  };

  const handleUpdateSetUnit = (groupIdx: number, setIdx: number, unit: string) => {
    const updated = [...editedGroups];
    updated[groupIdx].sets[setIdx].weightUnit = unit;
    setEditedGroups(updated);
  };

  const handleUpdateExerciseNote = (groupIdx: number, note: string) => {
    const updated = [...editedGroups];
    updated[groupIdx].exerciseNote = note;
    setEditedGroups(updated);
  };

  const handleAddSet = (groupIdx: number) => {
    const updated = [...editedGroups];
    const lastSet = updated[groupIdx].sets[updated[groupIdx].sets.length - 1];
    updated[groupIdx].sets.push({
      id: newSetCounter,
      setNumber: updated[groupIdx].sets.length + 1,
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 8,
      weightUnit: lastSet?.weightUnit || "lbs",
    });
    setNewSetCounter(newSetCounter - 1);
    setEditedGroups(updated);
  };

  const handleRemoveSet = (groupIdx: number, setIdx: number) => {
    const updated = [...editedGroups];
    const removedSet = updated[groupIdx].sets[setIdx];
    if (removedSet.id > 0) {
      setDeletedSetIds([...deletedSetIds, removedSet.id]);
    }
    updated[groupIdx].sets.splice(setIdx, 1);
    if (updated[groupIdx].sets.length === 0) {
      updated.splice(groupIdx, 1);
    }
    setEditedGroups(updated);
  };

  const handleAddExercise = () => {
    if (!allExercises || allExercises.length === 0) return;
    const firstExercise = allExercises[0];
    setEditedGroups([...editedGroups, {
      exerciseId: firstExercise.id,
      exerciseName: firstExercise.name,
      exerciseNote: "",
      sets: [{
        id: newSetCounter,
        setNumber: 1,
        weight: 0,
        reps: 8,
        weightUnit: "lbs",
      }],
    }]);
    setNewSetCounter(newSetCounter - 1);
  };

  const handleChangeExercise = (groupIdx: number, exerciseId: number) => {
    const exercise = allExercises?.find((e: Exercise) => e.id === exerciseId);
    if (!exercise) return;
    const updated = [...editedGroups];
    updated[groupIdx].exerciseId = exerciseId;
    updated[groupIdx].exerciseName = exercise.name;
    setEditedGroups(updated);
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Welcome back. Here's your training summary.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Workouts" 
            value={totalWorkouts} 
            icon={Activity}
            description="All time sessions"
          />
          <StatCard 
            title="Last Session Volume" 
            value={`${(lastSessionVolume / 1000).toFixed(1)}k`} 
            icon={Trophy}
            description="Total lbs lifted"
          />
          <StatCard 
            title="Active Exercises" 
            value={distinctExercises} 
            icon={Dumbbell}
            description="Exercises tracked"
          />
          <StatCard 
            title="Weekly Streak" 
            value="3" 
            icon={CalendarDays}
            description="Current active days"
            trend={{ value: 12, isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-lg font-semibold font-display">
                {viewMode === "week" ? "This Week" : "Recent Workouts"}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("week")}
                  data-testid="button-view-week"
                  className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                    viewMode === "week" 
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode("day")}
                  data-testid="button-view-day"
                  className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                    viewMode === "day"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Day
                </button>
                <Link href="/log">
                  <span className="text-sm text-primary font-medium hover:underline cursor-pointer ml-2">View all</span>
                </Link>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-card rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : viewMode === "week" && thisWeekWorkouts.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-card rounded-2xl p-6 border border-border">
                  <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <h4 className="font-semibold text-foreground">Week Summary</h4>
                    <span className="text-sm text-muted-foreground">{thisWeekWorkouts.length} workouts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Workouts</p>
                      <p className="text-2xl font-bold mt-1">{thisWeekWorkouts.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Sets</p>
                      <p className="text-2xl font-bold mt-1">{thisWeekWorkouts.reduce((acc: number, w: WorkoutWithSets) => acc + w.sets.length, 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Volume</p>
                      <p className="text-2xl font-bold mt-1">{(thisWeekVolume / 1000).toFixed(1)}k lbs</p>
                    </div>
                  </div>
                </div>
                {thisWeekWorkouts.sort((a: WorkoutWithSets, b: WorkoutWithSets) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((workout: WorkoutWithSets) => (
                  <div 
                    key={workout.id} 
                    onClick={() => handleOpenWorkout(workout)}
                    data-testid={`card-workout-${workout.id}`}
                    className="dashboard-card p-6 flex flex-col sm:flex-row sm:items-center justify-between group cursor-pointer hover-elevate"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {format(new Date(workout.date), "EEEE, MMM d")}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {workout.sets.length} sets
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Volume</p>
                        <p className="font-mono font-medium">
                          {workout.sets.reduce((acc: number, s: Set) => acc + (s.weight * s.reps), 0).toLocaleString()} lbs
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === "day" && recentWorkouts.length > 0 ? (
              <div className="space-y-4">
                {recentWorkouts.map((workout: WorkoutWithSets) => (
                  <div 
                    key={workout.id} 
                    onClick={() => handleOpenWorkout(workout)}
                    data-testid={`card-workout-${workout.id}`}
                    className="dashboard-card p-6 flex flex-col sm:flex-row sm:items-center justify-between group cursor-pointer hover-elevate"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {format(new Date(workout.date), "EEEE, MMMM do")}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {workout.sets.length} sets {workout.notes ? `• ${workout.notes.slice(0, 30)}${workout.notes.length > 30 ? "..." : ""}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 sm:mt-0 flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Volume</p>
                        <p className="font-mono font-medium">
                          {workout.sets.reduce((acc: number, s: Set) => acc + (s.weight * s.reps), 0).toLocaleString()} lbs
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No workouts {viewMode === "week" ? "this week" : "yet"}</h3>
                <p className="text-muted-foreground mb-6">Start tracking your fitness journey today.</p>
                <Link href="/log">
                  <Button data-testid="button-log-first-workout">Log First Workout</Button>
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold font-display">Quick Actions</h3>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20">
              <TrendingUp className="w-8 h-8 mb-4 opacity-80" />
              <h4 className="text-xl font-bold mb-2">Track Progress</h4>
              <p className="text-indigo-100 text-sm mb-6">
                See how your strength is improving over time with detailed analytics.
              </p>
              <Link href="/progress">
                <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl font-medium transition-all">
                  View Analytics
                </button>
              </Link>
            </div>

            <div className="dashboard-card p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Personal Records
              </h4>
              <div className="space-y-4">
                {[
                  { name: "Bench Press", value: "225 lbs" },
                  { name: "Squat", value: "315 lbs" },
                  { name: "Deadlift", value: "405 lbs" },
                ].map((pr, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{pr.name}</span>
                    <span className="font-mono font-medium">{pr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={!!selectedWorkout} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedWorkout && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <span>{format(new Date(selectedWorkout.date), "EEEE, MMMM do")}</span>
                  {!isEditing && (
                    <Button variant="ghost" size="icon" onClick={handleStartEdit} data-testid="button-edit-workout">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {selectedWorkout.sets.length} sets • {selectedWorkout.sets.reduce((acc, s) => acc + (s.weight * s.reps), 0).toLocaleString()} lbs total volume
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {isEditing && (
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit} data-testid="button-cancel-edit">
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={updateWorkout.isPending} data-testid="button-save-edit">
                      <Save className="w-4 h-4 mr-1" /> {updateWorkout.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Session Notes</label>
                  {isEditing ? (
                    <Textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="Add notes about this session..."
                      className="mt-1"
                      data-testid="input-session-notes"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-foreground">{selectedWorkout.notes || "No notes"}</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Exercises</h4>
                  <Accordion type="multiple" className="space-y-2">
                    {(isEditing ? editedGroups : groupSetsByExercise(selectedWorkout)).map((group, groupIdx) => (
                      <AccordionItem 
                        key={`${group.exerciseId}-${groupIdx}`} 
                        value={`${group.exerciseId}-${groupIdx}`}
                        className="border rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid={`accordion-exercise-${groupIdx}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                              {groupIdx + 1}
                            </div>
                            {isEditing ? (
                              <Select 
                                value={String(group.exerciseId)} 
                                onValueChange={(val) => handleChangeExercise(groupIdx, Number(val))}
                              >
                                <SelectTrigger className="w-48" data-testid={`select-exercise-${groupIdx}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {allExercises?.map((ex: Exercise) => (
                                    <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="font-medium">{group.exerciseName}</span>
                            )}
                            <span className="text-sm text-muted-foreground ml-auto mr-2">{group.sets.length} sets</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-3">
                            {group.sets.map((set, setIdx) => (
                              <div key={set.id} className="flex items-center gap-2" data-testid={`set-row-${groupIdx}-${setIdx}`}>
                                <span className="text-sm text-muted-foreground w-12">Set {setIdx + 1}</span>
                                {isEditing ? (
                                  <>
                                    <Input
                                      type="number"
                                      value={set.weight || ""}
                                      onChange={(e) => handleUpdateSetValue(groupIdx, setIdx, "weight", Number(e.target.value) || 0)}
                                      className={`w-20 ${set.weight < 0 ? "border-destructive" : ""}`}
                                      placeholder="Weight"
                                      data-testid={`input-weight-${groupIdx}-${setIdx}`}
                                    />
                                    <Select 
                                      value={set.weightUnit} 
                                      onValueChange={(val) => handleUpdateSetUnit(groupIdx, setIdx, val)}
                                    >
                                      <SelectTrigger className="w-16" data-testid={`select-unit-${groupIdx}-${setIdx}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="lbs">lbs</SelectItem>
                                        <SelectItem value="kg">kg</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <span className="text-muted-foreground">x</span>
                                    <Input
                                      type="number"
                                      value={set.reps || ""}
                                      onChange={(e) => handleUpdateSetValue(groupIdx, setIdx, "reps", Number(e.target.value) || 0)}
                                      className={`w-16 ${set.reps <= 0 ? "border-destructive" : ""}`}
                                      placeholder="Reps"
                                      data-testid={`input-reps-${groupIdx}-${setIdx}`}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveSet(groupIdx, setIdx)}
                                      className="text-destructive"
                                      data-testid={`button-remove-set-${groupIdx}-${setIdx}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-sm font-mono">
                                    {set.weight} {set.weightUnit} x {set.reps} reps
                                  </span>
                                )}
                              </div>
                            ))}
                            
                            {isEditing && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddSet(groupIdx)}
                                className="w-full mt-2"
                                data-testid={`button-add-set-${groupIdx}`}
                              >
                                <Plus className="w-4 h-4 mr-1" /> Add Set
                              </Button>
                            )}

                            <div className="mt-3 pt-3 border-t">
                              <label className="text-xs font-medium text-muted-foreground">Exercise Notes</label>
                              {isEditing ? (
                                <Input
                                  value={group.exerciseNote}
                                  onChange={(e) => handleUpdateExerciseNote(groupIdx, e.target.value)}
                                  placeholder="Notes for this exercise..."
                                  className="mt-1"
                                  data-testid={`input-exercise-note-${groupIdx}`}
                                />
                              ) : (
                                <p className="text-sm mt-1">{group.exerciseNote || "No notes"}</p>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {isEditing && (
                    <Button
                      variant="outline"
                      onClick={handleAddExercise}
                      className="w-full mt-4"
                      data-testid="button-add-exercise"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Exercise
                    </Button>
                  )}
                </div>

                {isEditing && (
                  <div className="pt-4 border-t">
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteWorkout}
                      disabled={deleteWorkout.isPending}
                      className="w-full"
                      data-testid="button-delete-workout"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> {deleteWorkout.isPending ? "Deleting..." : "Delete Workout"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
