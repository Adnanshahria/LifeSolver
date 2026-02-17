import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export const HABIT_CATEGORIES = [
    { value: "general", label: "General", emoji: "📌" },
    { value: "health", label: "Health", emoji: "💪" },
    { value: "learning", label: "Learning", emoji: "📚" },
    { value: "productivity", label: "Productivity", emoji: "⚡" },
    { value: "mindfulness", label: "Mindfulness", emoji: "🧘" },
    { value: "social", label: "Social", emoji: "👥" },
    { value: "creative", label: "Creative", emoji: "🎨" },
] as const;

export type HabitCategory = typeof HABIT_CATEGORIES[number]["value"];

export interface Habit {
    id: string;
    user_id: string;
    habit_name: string;
    streak_count: number;
    last_completed_date?: string;
    category: HabitCategory;
}

export function useHabits() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const habitsQuery = useQuery({
        queryKey: ["habits", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM habits WHERE user_id = ? ORDER BY habit_name",
                args: [userId],
            });
            return (result.rows as unknown as Habit[]).map(h => ({
                ...h,
                category: h.category || "general",
            }));
        },
        enabled: !!userId,
    });

    const addHabit = useMutation({
        mutationFn: async ({ name, category }: { name: string; category?: HabitCategory }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            await db.execute({
                sql: "INSERT INTO habits (id, user_id, habit_name, streak_count, category) VALUES (?, ?, ?, 0, ?)",
                args: [id, userId, name, category || "general"],
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
    });

    const updateHabit = useMutation({
        mutationFn: async ({ id, name, category }: { id: string; name?: string; category?: HabitCategory }) => {
            const sets: string[] = [];
            const args: string[] = [];
            if (name !== undefined) { sets.push("habit_name = ?"); args.push(name); }
            if (category !== undefined) { sets.push("category = ?"); args.push(category); }
            if (sets.length === 0) return;
            args.push(id);
            await db.execute({
                sql: `UPDATE habits SET ${sets.join(", ")} WHERE id = ?`,
                args,
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
    });

    const completeHabit = useMutation({
        mutationFn: async ({ habit, date }: { habit: Habit; date?: string }) => {
            const todayStr = new Date().toISOString().split("T")[0];
            const targetDateStr = date ? date.split("T")[0] : todayStr;
            const targetDate = new Date(targetDateStr);
            targetDate.setHours(0, 0, 0, 0);

            const lastCompletedStr = habit.last_completed_date?.split("T")[0];
            const lastCompletedDate = lastCompletedStr ? new Date(lastCompletedStr) : null;
            if (lastCompletedDate) lastCompletedDate.setHours(0, 0, 0, 0);

            // Calculate streak start date
            let streakStartDate: Date | null = null;
            if (lastCompletedDate && habit.streak_count > 0) {
                streakStartDate = new Date(lastCompletedDate);
                streakStartDate.setDate(streakStartDate.getDate() - habit.streak_count + 1);
                streakStartDate.setHours(0, 0, 0, 0);
            }

            let newStreak = 1;
            let newLastCompleted = targetDateStr;

            if (!lastCompletedDate) {
                // First completion
                newStreak = 1;
                newLastCompleted = targetDateStr;
            } else if (targetDate.getTime() > lastCompletedDate.getTime()) {
                // Future completion relative to last (Forward)
                const diffTime = targetDate.getTime() - lastCompletedDate.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    newStreak = habit.streak_count + 1;
                } else {
                    newStreak = 1; // Gap > 1 day, reset streak
                }
                newLastCompleted = targetDateStr;
            } else if (targetDate.getTime() === lastCompletedDate.getTime()) {
                // Same date - toggle off? Or just re-confirm?
                // For now, re-confirm (idempotent). To toggle off, we need separate logic.
                // Assuming "complete" always sets it to done.
                newStreak = habit.streak_count;
                newLastCompleted = lastCompletedStr!;
            } else {
                // Past completion relative to last (Backward)
                // Check if it's immediately before the current streak
                if (streakStartDate) {
                    const diffTime = streakStartDate.getTime() - targetDate.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        // Exactly one day before current streak start
                        newStreak = habit.streak_count + 1;
                        newLastCompleted = lastCompletedStr!; // Last date doesn't change!
                    } else {
                        // Gap or already inside streak?
                        // If inside streak, do nothing (idempotent)
                        if (targetDate >= streakStartDate) {
                            return; // Already done
                        }
                        // If gap before streak, we can't represent it with current schema
                        // So we just ignore it or treat it as a new separate streak?
                        // Current schema only supports ONE streak. So we ignore disjoint past completions.
                        console.warn("Cannot mark disjoint past date with current schema", targetDateStr);
                        return;
                    }
                } else {
                    // Should not happen if lastCompletedDate exists
                    newStreak = 1;
                    newLastCompleted = targetDateStr;
                }
            }

            await db.execute({
                sql: "UPDATE habits SET streak_count = ?, last_completed_date = ? WHERE id = ?",
                args: [newStreak, newLastCompleted, habit.id],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
    });

    const deleteHabit = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM habits WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
    });

    const deleteAllHabits = useMutation({
        mutationFn: async () => {
            if (!userId) throw new Error("Not authenticated");
            await db.execute({ sql: "DELETE FROM habits WHERE user_id = ?", args: [userId] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
    });

    return {
        habits: habitsQuery.data ?? [],
        isLoading: habitsQuery.isLoading,
        error: habitsQuery.error,
        addHabit,
        updateHabit,
        completeHabit,
        deleteHabit,
        deleteAllHabits,
    };
}
