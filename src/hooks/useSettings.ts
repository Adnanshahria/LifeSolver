import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export interface UserSettings {
    id: string;
    user_id: string;
    theme: "light" | "dark";
    currency: string;
    language: string;
    notifications_enabled: boolean;
    monthly_budget: number;
}

export function useSettings() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const settingsQuery = useQuery({
        queryKey: ["settings", userId],
        queryFn: async () => {
            if (!userId) return null;
            const result = await db.execute({
                sql: "SELECT * FROM settings WHERE user_id = ?",
                args: [userId],
            });
            if (result.rows.length === 0) {
                // Create default settings if not exist
                const id = generateId();
                await db.execute({
                    sql: "INSERT INTO settings (id, user_id) VALUES (?, ?)",
                    args: [id, userId],
                });
                return {
                    id,
                    user_id: userId,
                    theme: "dark" as const,
                    currency: "BDT",
                    language: "en",
                    notifications_enabled: true,
                    monthly_budget: 0,
                };
            }
            const row = result.rows[0];
            return {
                id: row.id as string,
                user_id: row.user_id as string,
                theme: (row.theme as "light" | "dark") || "dark",
                currency: (row.currency as string) || "BDT",
                language: (row.language as string) || "en",
                notifications_enabled: Boolean(row.notifications_enabled),
                monthly_budget: (row.monthly_budget as number) || 0,
            };
        },
        enabled: !!userId,
    });

    const updateSettings = useMutation({
        mutationFn: async (updates: Partial<UserSettings>) => {
            if (!userId) throw new Error("Not authenticated");
            const fields: string[] = [];
            const values: (string | number)[] = [];

            if (updates.theme !== undefined) {
                fields.push("theme = ?");
                values.push(updates.theme);
            }
            if (updates.currency !== undefined) {
                fields.push("currency = ?");
                values.push(updates.currency);
            }
            if (updates.language !== undefined) {
                fields.push("language = ?");
                values.push(updates.language);
            }
            if (updates.notifications_enabled !== undefined) {
                fields.push("notifications_enabled = ?");
                values.push(updates.notifications_enabled ? 1 : 0);
            }
            if (updates.monthly_budget !== undefined) {
                fields.push("monthly_budget = ?");
                values.push(updates.monthly_budget);
            }

            fields.push("updated_at = CURRENT_TIMESTAMP");
            values.push(userId);

            if (fields.length > 1) {
                await db.execute({
                    sql: `UPDATE settings SET ${fields.join(", ")} WHERE user_id = ?`,
                    args: values,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
        },
    });

    return {
        settings: settingsQuery.data,
        isLoading: settingsQuery.isLoading,
        error: settingsQuery.error,
        updateSettings,
    };
}
