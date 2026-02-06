import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export interface Task {
    id: string;
    user_id: string;
    title: string;
    status: "todo" | "in-progress" | "done";
    priority: "low" | "medium" | "high";
    due_date?: string;
    created_at: string;
}

export function useTasks() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const tasksQuery = useQuery({
        queryKey: ["tasks", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
                args: [userId],
            });
            return result.rows as unknown as Task[];
        },
        enabled: !!userId,
    });

    const addTask = useMutation({
        mutationFn: async (task: Omit<Task, "id" | "user_id" | "created_at">) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            await db.execute({
                sql: "INSERT INTO tasks (id, user_id, title, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)",
                args: [id, userId, task.title, task.status || "todo", task.priority || "medium", task.due_date || null],
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    });

    const updateTask = useMutation({
        mutationFn: async (task: Partial<Task> & { id: string }) => {
            const fields: string[] = [];
            const args: (string | number | null)[] = [];

            if (task.title !== undefined) {
                fields.push("title = ?");
                args.push(task.title);
            }
            if (task.status !== undefined) {
                fields.push("status = ?");
                args.push(task.status);
            }
            if (task.priority !== undefined) {
                fields.push("priority = ?");
                args.push(task.priority);
            }
            if (task.due_date !== undefined) {
                fields.push("due_date = ?");
                args.push(task.due_date);
            }

            if (fields.length > 0) {
                args.push(task.id);
                await db.execute({
                    sql: `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
                    args,
                });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    });

    const deleteTask = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM tasks WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    });

    return {
        tasks: tasksQuery.data ?? [],
        isLoading: tasksQuery.isLoading,
        error: tasksQuery.error,
        addTask,
        updateTask,
        deleteTask,
    };
}
