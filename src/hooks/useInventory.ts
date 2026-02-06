import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export interface InventoryItem {
    id: string;
    user_id: string;
    item_name: string;
    cost?: number;
    purchase_date?: string;
    store?: string;
}

export function useInventory() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const inventoryQuery = useQuery({
        queryKey: ["inventory", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM inventory WHERE user_id = ? ORDER BY purchase_date DESC, item_name",
                args: [userId],
            });
            return result.rows as unknown as InventoryItem[];
        },
        enabled: !!userId,
    });

    const addItem = useMutation({
        mutationFn: async (item: Omit<InventoryItem, "id" | "user_id">) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            await db.execute({
                sql: "INSERT INTO inventory (id, user_id, item_name, cost, purchase_date, store) VALUES (?, ?, ?, ?, ?, ?)",
                args: [id, userId, item.item_name, item.cost || null, item.purchase_date || null, item.store || null],
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
    });

    const updateItem = useMutation({
        mutationFn: async (item: InventoryItem) => {
            await db.execute({
                sql: "UPDATE inventory SET item_name = ?, cost = ?, purchase_date = ?, store = ? WHERE id = ?",
                args: [item.item_name, item.cost || null, item.purchase_date || null, item.store || null, item.id],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
    });

    const deleteItem = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM inventory WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
    });

    const totalValue = (inventoryQuery.data ?? []).reduce((sum, item) => sum + (item.cost || 0), 0);

    return {
        items: inventoryQuery.data ?? [],
        totalValue,
        isLoading: inventoryQuery.isLoading,
        error: inventoryQuery.error,
        addItem,
        updateItem,
        deleteItem,
    };
}
