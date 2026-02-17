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
        mutationFn: async (habit: Habit) => {
            const today = new Date().toISOString().split("T")[0];
            const lastCompleted = habit.last_completed_date?.split("T")[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

            let newStreak = 1;
            if (lastCompleted === yesterday) {
                newStreak = habit.streak_count + 1;
            } else if (lastCompleted === today) {
                newStreak = habit.streak_count; // Already completed today
            }

            await db.execute({
                sql: "UPDATE habits SET streak_count = ?, last_completed_date = ? WHERE id = ?",
                args: [newStreak, new Date().toISOString(), habit.id],
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

    return {
        habits: habitsQuery.data ?? [],
        isLoading: habitsQuery.isLoading,
        error: habitsQuery.error,
        addHabit,
        updateHabit,
        completeHabit,
        deleteHabit,
    };
}
