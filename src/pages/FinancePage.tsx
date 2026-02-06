import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinance, FinanceEntry } from "@/hooks/useFinance";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORIES = ["Food", "Transport", "Entertainment", "Bills", "Shopping", "Freelance", "Salary", "Other"];
const COLORS = ["#00D4AA", "#0EA5E9", "#F59E0B", "#EC4899", "#8B5CF6", "#10B981", "#6366F1", "#6B7280"];

export default function FinancePage() {
    const { entries, expenses, incomes, totalExpenses, totalIncome, balance, expensesByCategory, isLoading, addEntry, deleteEntry } = useFinance();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newEntry, setNewEntry] = useState<{
        type: "income" | "expense";
        amount: string;
        category: string;
        description: string;
    }>({
        type: "expense",
        amount: "",
        category: "",
        description: "",
    });

    const handleAddEntry = async () => {
        if (!newEntry.amount || !newEntry.category) return;
        await addEntry.mutateAsync({
            type: newEntry.type,
            amount: parseFloat(newEntry.amount),
            category: newEntry.category,
            description: newEntry.description,
        });
        setNewEntry({ type: "expense", amount: "", category: "", description: "" });
        setIsDialogOpen(false);
    };

    const chartData = Object.entries(expensesByCategory).map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
    }));

    return (
        <AppLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Finance</h1>
                        <p className="text-muted-foreground">Track your income and expenses</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Entry
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Finance Entry</DialogTitle>
                                <DialogDescription>
                                    Create a new income or expense entry.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Tabs value={newEntry.type} onValueChange={(v) => setNewEntry({ ...newEntry, type: v as "income" | "expense" })}>
                                    <TabsList className="w-full">
                                        <TabsTrigger
                                            value="expense"
                                            className="flex-1 data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all"
                                        >
                                            Expense
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="income"
                                            className="flex-1 data-[state=active]:bg-green-500 data-[state=active]:text-white transition-all"
                                        >
                                            Income
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Input
                                    type="number"
                                    placeholder="Amount (৳)"
                                    value={newEntry.amount}
                                    onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                                />
                                <Select
                                    value={newEntry.category}
                                    onValueChange={(v) => setNewEntry({ ...newEntry, category: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="Description (optional)"
                                    value={newEntry.description}
                                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                                />
                                <Button onClick={handleAddEntry} className="w-full" disabled={addEntry.isPending}>
                                    {addEntry.isPending ? "Adding..." : `Add ${newEntry.type}`}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-5"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-muted-foreground">Total Income</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">৳{totalIncome.toLocaleString()}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-5"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-red-500/20">
                                <TrendingDown className="w-5 h-5 text-red-400" />
                            </div>
                            <span className="text-muted-foreground">Total Expenses</span>
                        </div>
                        <p className="text-2xl font-bold text-red-400">৳{totalExpenses.toLocaleString()}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-5"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/20">
                                <Wallet className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-muted-foreground">Balance</span>
                        </div>
                        <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                            ৳{balance.toLocaleString()}
                        </p>
                    </motion.div>
                </div>

                {/* Chart & List */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Expense Chart */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-5"
                    >
                        <h3 className="font-semibold mb-4">Expenses by Category</h3>
                        {chartData.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: ৳${value}`}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `৳${value}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No expense data yet
                            </div>
                        )}
                    </motion.div>

                    {/* Recent Transactions */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-5"
                    >
                        <h3 className="font-semibold mb-4">Recent Transactions</h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {isLoading ? (
                                <p className="text-muted-foreground">Loading...</p>
                            ) : entries.length === 0 ? (
                                <p className="text-muted-foreground">No transactions yet</p>
                            ) : (
                                entries.slice(0, 10).map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-full ${entry.type === "income" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                                                {entry.type === "income" ? (
                                                    <TrendingUp className="w-3 h-3 text-green-400" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 text-red-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{entry.category}</p>
                                                {entry.description && (
                                                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${entry.type === "income" ? "text-green-400" : "text-red-400"}`}>
                                                {entry.type === "income" ? "+" : "-"}৳{entry.amount}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => deleteEntry.mutate(entry.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AppLayout>
    );
}
