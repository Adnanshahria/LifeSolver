import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Package, Store, Trash2, Edit2 } from "lucide-react";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useInventory, InventoryItem } from "@/hooks/useInventory";

export default function InventoryPage() {
    const { items, totalValue, isLoading, addItem, updateItem, deleteItem } = useInventory();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [newItem, setNewItem] = useState({
        item_name: "",
        cost: "",
        purchase_date: "",
        store: "",
    });

    const handleAddItem = async () => {
        if (!newItem.item_name.trim()) return;
        await addItem.mutateAsync({
            item_name: newItem.item_name,
            cost: newItem.cost ? parseFloat(newItem.cost) : undefined,
            purchase_date: newItem.purchase_date || undefined,
            store: newItem.store || undefined,
        });
        setNewItem({ item_name: "", cost: "", purchase_date: "", store: "" });
        setIsDialogOpen(false);
    };

    const handleUpdateItem = async () => {
        if (!editingItem) return;
        await updateItem.mutateAsync(editingItem);
        setEditingItem(null);
    };

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
                        <h1 className="text-3xl font-bold">Inventory</h1>
                        <p className="text-muted-foreground">Track your purchases and belongings</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="glass-card px-4 py-2">
                            <span className="text-sm text-muted-foreground">Total Value: </span>
                            <span className="font-bold text-primary">৳{totalValue.toLocaleString()}</span>
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Item
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Inventory Item</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <Input
                                        placeholder="Item name"
                                        value={newItem.item_name}
                                        onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            type="number"
                                            placeholder="Cost (৳)"
                                            value={newItem.cost}
                                            onChange={(e) => setNewItem({ ...newItem, cost: e.target.value })}
                                        />
                                        <Input
                                            type="date"
                                            value={newItem.purchase_date}
                                            onChange={(e) => setNewItem({ ...newItem, purchase_date: e.target.value })}
                                        />
                                    </div>
                                    <Input
                                        placeholder="Store (optional)"
                                        value={newItem.store}
                                        onChange={(e) => setNewItem({ ...newItem, store: e.target.value })}
                                    />
                                    <Button onClick={handleAddItem} className="w-full" disabled={addItem.isPending}>
                                        {addItem.isPending ? "Adding..." : "Add Item"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Inventory Table */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card overflow-hidden"
                >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Cost</TableHead>
                                <TableHead>Purchase Date</TableHead>
                                <TableHead>Store</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Loading inventory...
                                    </TableCell>
                                </TableRow>
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No items yet. Add your first item!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-primary" />
                                                <span className="font-medium">{item.item_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {item.cost ? `৳${item.cost.toLocaleString()}` : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {item.store ? (
                                                <Badge variant="secondary" className="gap-1">
                                                    <Store className="w-3 h-3" />
                                                    {item.store}
                                                </Badge>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEditingItem(item)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteItem.mutate(item.id)}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </motion.div>

                {/* Edit Dialog */}
                <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Item</DialogTitle>
                        </DialogHeader>
                        {editingItem && (
                            <div className="space-y-4 pt-4">
                                <Input
                                    placeholder="Item name"
                                    value={editingItem.item_name}
                                    onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="number"
                                        placeholder="Cost (৳)"
                                        value={editingItem.cost || ""}
                                        onChange={(e) => setEditingItem({ ...editingItem, cost: parseFloat(e.target.value) || 0 })}
                                    />
                                    <Input
                                        type="date"
                                        value={editingItem.purchase_date || ""}
                                        onChange={(e) => setEditingItem({ ...editingItem, purchase_date: e.target.value })}
                                    />
                                </div>
                                <Input
                                    placeholder="Store"
                                    value={editingItem.store || ""}
                                    onChange={(e) => setEditingItem({ ...editingItem, store: e.target.value })}
                                />
                                <Button onClick={handleUpdateItem} className="w-full" disabled={updateItem.isPending}>
                                    {updateItem.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
        </AppLayout>
    );
}
