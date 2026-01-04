import { useState } from "react";
import { Layout } from "@/components/layout";
import { useExercises, useExerciseStats } from "@/hooks/use-exercises";
import { format } from "date-fns";
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Dumbbell, History } from "lucide-react";

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

export default function Progress() {
  const { data: exercises } = useExercises();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [chartUnit, setChartUnit] = useState<"lbs" | "kg">("lbs");
  
  const { data: stats, isLoading } = useExerciseStats(
    selectedExerciseId ? parseInt(selectedExerciseId) : null
  );

  const convertWeight = (weight: number, fromUnit: string, toUnit: string): number => {
    if (fromUnit === toUnit) return weight;
    if (fromUnit === "kg" && toUnit === "lbs") return Math.round(weight * KG_TO_LBS);
    if (fromUnit === "lbs" && toUnit === "kg") return Math.round(weight * LBS_TO_KG);
    return weight;
  };

  const chartData = stats?.map(stat => {
    const convertedWeight = convertWeight(stat.maxWeight, stat.maxWeightUnit || "lbs", chartUnit);
    return {
      ...stat,
      displayWeight: convertedWeight,
      formattedDate: format(new Date(stat.date), "MMM d"),
      fullDate: format(new Date(stat.date), "MMMM d, yyyy"),
      tooltipLabel: `${convertedWeight} ${chartUnit} (${stat.maxWeightReps} reps)`,
    };
  }).reverse();

  const maxWeight = chartData?.reduce((max, stat) => Math.max(max, stat.displayWeight), 0) || 0;
  const totalLifted = stats?.reduce((sum, stat) => sum + stat.totalVolume, 0) || 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-1">{data.fullDate}</p>
          <p className="text-lg font-bold">
            {data.displayWeight} {chartUnit}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              ({data.maxWeightReps} reps)
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display">Progress Analysis</h2>
            <p className="text-muted-foreground mt-1">Visualize your strength gains over time.</p>
          </div>
          
          <div className="w-full md:w-72">
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
              Select Exercise
            </label>
            <div className="relative">
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none shadow-sm cursor-pointer"
                data-testid="select-exercise"
              >
                <option value="" disabled>Choose exercise...</option>
                {exercises?.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {!selectedExerciseId ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card/50 border-2 border-dashed border-border rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No Exercise Selected</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-center">
              Select an exercise from the dropdown above to view your progress history and personal records.
            </p>
          </div>
        ) : isLoading ? (
          <div className="h-[400px] bg-card rounded-3xl animate-pulse" />
        ) : stats && stats.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">All-time PR</p>
                <div className="flex items-end gap-2 mt-2">
                  <h3 className="text-3xl font-bold font-display">{maxWeight}</h3>
                  <span className="text-sm font-medium mb-1.5 text-muted-foreground">{chartUnit}</span>
                </div>
              </div>
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <div className="flex items-end gap-2 mt-2">
                  <h3 className="text-3xl font-bold font-display">{stats.length}</h3>
                  <span className="text-sm font-medium mb-1.5 text-muted-foreground">logs</span>
                </div>
              </div>
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Total Volume Lifted</p>
                <div className="flex items-end gap-2 mt-2">
                  <h3 className="text-3xl font-bold font-display">{(totalLifted / 1000).toFixed(1)}k</h3>
                  <span className="text-sm font-medium mb-1.5 text-muted-foreground">mixed</span>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold font-display">Max Weight History</h3>
                  <p className="text-sm text-muted-foreground">Tracking your top set weight over time</p>
                </div>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setChartUnit("lbs")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      chartUnit === "lbs" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="button-unit-lbs"
                  >
                    lbs
                  </button>
                  <button
                    onClick={() => setChartUnit("kg")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      chartUnit === "kg" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="button-unit-kg"
                  >
                    kg
                  </button>
                </div>
              </div>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="formattedDate" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                      unit={` ${chartUnit}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="displayWeight" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorWeight)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <h3 className="font-bold font-display">Log History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-6 py-4 text-left font-medium text-muted-foreground">Max Weight</th>
                      <th className="px-6 py-4 text-left font-medium text-muted-foreground">Reps</th>
                      <th className="px-6 py-4 text-left font-medium text-muted-foreground">Total Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.map((stat, i) => {
                      const displayWeight = convertWeight(stat.maxWeight, stat.maxWeightUnit || "lbs", chartUnit);
                      return (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-medium">{format(new Date(stat.date), "PPP")}</td>
                          <td className="px-6 py-4 font-mono">{displayWeight} {chartUnit}</td>
                          <td className="px-6 py-4 font-mono">{stat.maxWeightReps}</td>
                          <td className="px-6 py-4 font-mono">{stat.totalVolume.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-card/50 border-2 border-dashed border-border rounded-3xl">
            <p className="text-muted-foreground">No data recorded for this exercise yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
