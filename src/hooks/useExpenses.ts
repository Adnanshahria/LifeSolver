import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";

export interface Expense {
    id: string;
    amount: number;
    category: string;
    description?: string;
    date: string;
}

export function useExpenses() {
    const queryClient = useQueryClient();

    const expensesQuery = useQuery({
        queryKey: ["expenses"],
        queryFn: async () => {
            const result = await db.execute("SELECT * FROM expenses ORDER BY date DESC");
            return result.rows as unknown as Expense[];
        },
    });

    const addExpense = useMutation({
        mutationFn: async (expense: Omit<Expense, "id" | "date">) => {
            const id = generateId();
            await db.execute({
                sql: "INSERT INTO expenses (id, amount, category, description) VALUES (?, ?, ?, ?)",
                args: [id, expense.amount, expense.category, expense.description || null],
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
    });

    const deleteExpense = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM expenses WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
    });

    // Calculate totals by category
    const totalsByCategory = (expensesQuery.data ?? []).reduce(
        (acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
            return acc;
        },
        {} as Record<string, number>
    );

    const total = (expensesQuery.data ?? []).reduce((acc, exp) => acc + exp.amount, 0);

    return {
        expenses: expensesQuery.data ?? [],
        isLoading: expensesQuery.isLoading,
        error: expensesQuery.error,
        totalsByCategory,
        total,
        addExpense,
        deleteExpense,
    };
}
