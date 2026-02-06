import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Check, Clock, AlertTriangle, Trash2, Edit2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { useTasks, Task } from "@/hooks/useTasks";

const priorityColors = {
    low: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusIcons = {
    todo: <Clock className="w-4 h-4" />,
    "in-progress": <AlertTriangle className="w-4 h-4" />,
    done: <Check className="w-4 h-4" />,
};

export default function TasksPage() {
    const { tasks, isLoading, addTask, updateTask, deleteTask } = useTasks();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filter, setFilter] = useState<string>("all");
    const [newTask, setNewTask] = useState<{
        title: string;
        priority: Task["priority"];
        status: Task["status"];
        due_date: string;
    }>({
        title: "",
        priority: "medium",
        status: "todo",
        due_date: "",
    });

    const handleAddTask = async () => {
        if (!newTask.title.trim()) return;
        await addTask.mutateAsync(newTask);
        setNewTask({ title: "", priority: "medium", status: "todo", due_date: "" });
        setIsDialogOpen(false);
    };

    const handleStatusChange = (task: Task, status: Task["status"]) => {
        updateTask.mutate({ id: task.id, status });
    };

    const filteredTasks = tasks.filter((task) => {
        if (filter === "all") return true;
        return task.status === filter;
    });

    const taskCounts = {
        all: tasks.length,
        todo: tasks.filter((t) => t.status === "todo").length,
        "in-progress": tasks.filter((t) => t.status === "in-progress").length,
        done: tasks.filter((t) => t.status === "done").length,
    };

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
                        <h1 className="text-3xl font-bold">Tasks</h1>
                        <p className="text-muted-foreground">Manage your tasks and stay productive</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Task</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Input
                                    placeholder="Task title..."
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Select
                                        value={newTask.priority}
                                        onValueChange={(v) => setNewTask({ ...newTask, priority: v as Task["priority"] })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="date"
                                        value={newTask.due_date}
                                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                    />
                                </div>
                                <Button onClick={handleAddTask} className="w-full" disabled={addTask.isPending}>
                                    {addTask.isPending ? "Adding..." : "Add Task"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {(["all", "todo", "in-progress", "done"] as const).map((status) => (
                        <Button
                            key={status}
                            variant={filter === status ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter(status)}
                            className="gap-2"
                        >
                            {status === "all" ? "All" : status.replace("-", " ")}
                            <Badge variant="secondary" className="ml-1">
                                {taskCounts[status]}
                            </Badge>
                        </Button>
                    ))}
                </div>

                {/* Task List */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No tasks found. Add your first task!
                        </div>
                    ) : (
                        filteredTasks.map((task, index) => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="glass-card p-4 flex items-center gap-4"
                            >
                                {/* Status Button */}
                                <button
                                    onClick={() => {
                                        const nextStatus = {
                                            todo: "in-progress",
                                            "in-progress": "done",
                                            done: "todo",
                                        } as const;
                                        handleStatusChange(task, nextStatus[task.status]);
                                    }}
                                    className={`p-2 rounded-full transition-colors ${task.status === "done"
                                        ? "bg-green-500/20 text-green-400"
                                        : task.status === "in-progress"
                                            ? "bg-yellow-500/20 text-yellow-400"
                                            : "bg-muted hover:bg-muted/80"
                                        }`}
                                >
                                    {statusIcons[task.status]}
                                </button>

                                {/* Task Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                                        {task.title}
                                    </p>
                                    {task.due_date && (
                                        <p className="text-sm text-muted-foreground">Due: {task.due_date}</p>
                                    )}
                                </div>

                                {/* Priority Badge */}
                                <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>

                                {/* Actions */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteTask.mutate(task.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>
        </AppLayout>
    );
}
