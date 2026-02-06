import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Flame, Check, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useHabits, Habit } from "@/hooks/useHabits";

export default function HabitsPage() {
    const { habits, isLoading, addHabit, completeHabit, deleteHabit } = useHabits();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newHabitName, setNewHabitName] = useState("");

    const handleAddHabit = async () => {
        if (!newHabitName.trim()) return;
        await addHabit.mutateAsync(newHabitName);
        setNewHabitName("");
        setIsDialogOpen(false);
    };

    const isCompletedToday = (habit: Habit) => {
        if (!habit.last_completed_date) return false;
        const today = new Date().toISOString().split("T")[0];
        const lastCompleted = habit.last_completed_date.split("T")[0];
        return lastCompleted === today;
    };

    const totalCompleted = habits.filter(isCompletedToday).length;
    const completionRate = habits.length > 0 ? Math.round((totalCompleted / habits.length) * 100) : 0;

    return (
        <AppLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Habits</h1>
                        <p className="text-muted-foreground">Build lasting habits with streak tracking</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Habit
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Habit</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Input
                                    placeholder="Habit name (e.g., Exercise, Read, Meditate)"
                                    value={newHabitName}
                                    onChange={(e) => setNewHabitName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddHabit()}
                                />
                                <Button onClick={handleAddHabit} className="w-full" disabled={addHabit.isPending}>
                                    {addHabit.isPending ? "Creating..." : "Create Habit"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-4 text-center"
                    >
                        <p className="text-3xl font-bold text-primary">{habits.length}</p>
                        <p className="text-sm text-muted-foreground">Total Habits</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-4 text-center"
                    >
                        <p className="text-3xl font-bold text-green-400">{totalCompleted}</p>
                        <p className="text-sm text-muted-foreground">Done Today</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-4 text-center"
                    >
                        <p className="text-3xl font-bold text-yellow-400">{completionRate}%</p>
                        <p className="text-sm text-muted-foreground">Today's Rate</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-4 text-center"
                    >
                        <p className="text-3xl font-bold text-orange-400">
                            {Math.max(...habits.map((h) => h.streak_count), 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Best Streak</p>
                    </motion.div>
                </div>

                {/* Habit List */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading habits...</div>
                    ) : habits.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No habits yet. Create your first habit!
                        </div>
                    ) : (
                        habits.map((habit, index) => {
                            const completed = isCompletedToday(habit);
                            return (
                                <motion.div
                                    key={habit.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`glass-card p-4 flex items-center gap-4 transition-all ${completed ? "border-green-500/50 bg-green-500/5" : ""
                                        }`}
                                >
                                    {/* Complete Button */}
                                    <button
                                        onClick={() => !completed && completeHabit.mutate(habit)}
                                        disabled={completed}
                                        className={`p-3 rounded-full transition-all ${completed
                                                ? "bg-green-500/20 text-green-400 cursor-default"
                                                : "bg-muted hover:bg-primary/20 hover:text-primary"
                                            }`}
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>

                                    {/* Habit Info */}
                                    <div className="flex-1">
                                        <p className={`font-medium text-lg ${completed ? "text-green-400" : ""}`}>
                                            {habit.habit_name}
                                        </p>
                                        {habit.last_completed_date && (
                                            <p className="text-sm text-muted-foreground">
                                                Last: {new Date(habit.last_completed_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Streak */}
                                    <div className="flex items-center gap-2">
                                        <Flame className={`w-5 h-5 ${habit.streak_count > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
                                        <Badge
                                            variant={habit.streak_count > 0 ? "default" : "secondary"}
                                            className={habit.streak_count > 0 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : ""}
                                        >
                                            {habit.streak_count} day{habit.streak_count !== 1 ? "s" : ""}
                                        </Badge>
                                    </div>

                                    {/* Delete */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteHabit.mutate(habit.id)}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </AppLayout>
    );
}
