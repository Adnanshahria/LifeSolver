import { useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ListTodo, 
  Target, 
  TrendingUp,
  CalendarDays
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskList } from "@/components/dashboard/TaskList";
import { HabitTracker } from "@/components/dashboard/HabitTracker";
import { ExpenseChart } from "@/components/dashboard/ExpenseChart";
import { AIBriefing } from "@/components/dashboard/AIBriefing";
import { useTheme } from "@/hooks/useTheme";

// Mock data - will be replaced with real data from Turso
const mockTasks = [
  { id: "1", title: "Complete React project", status: "in-progress" as const, priority: "high" as const, dueDate: "Today, 5:00 PM" },
  { id: "2", title: "Review budget spreadsheet", status: "todo" as const, priority: "medium" as const, dueDate: "Today, 8:00 PM" },
  { id: "3", title: "Call mom", status: "done" as const, priority: "low" as const },
  { id: "4", title: "Prepare presentation", status: "todo" as const, priority: "high" as const, dueDate: "Today, 11:59 PM" },
];

const mockHabits = [
  { id: "1", name: "Morning Exercise", streak: 15, completedToday: true },
  { id: "2", name: "Read 30 minutes", streak: 8, completedToday: false },
  { id: "3", name: "Drink 8 glasses water", streak: 22, completedToday: true },
  { id: "4", name: "Meditation", streak: 5, completedToday: false },
];

const mockExpenses = [
  { name: "Food", value: 4500, color: "hsl(187, 85%, 53%)" },
  { name: "Transport", value: 2000, color: "hsl(152, 69%, 50%)" },
  { name: "Entertainment", value: 1500, color: "hsl(38, 92%, 55%)" },
  { name: "Bills", value: 3500, color: "hsl(280, 65%, 60%)" },
  { name: "Shopping", value: 2500, color: "hsl(340, 75%, 55%)" },
];

const mockInsights = {
  summary: "You've completed 60% of today's tasks. Your spending is 15% under budget this month. Keep up the great work with your exercise habit - 15 days strong! 💪",
  tips: [
    "Consider batching similar tasks to improve focus",
    "Your food expenses are trending up - maybe try meal prep?",
  ],
  alerts: [
    "2 high-priority tasks due today",
    "Meditation streak at risk - don't forget!",
  ],
};

const Index = () => {
  const { theme } = useTheme();

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.classList.add(theme);
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AppLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <CalendarDays className="w-4 h-4" />
          <span>{today}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Good afternoon, <span className="text-gradient">Adnan</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's your daily snapshot
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Budget Left"
          value="৳12,500"
          subtitle="of ৳25,000 monthly"
          icon={Wallet}
          trend={{ value: 15, isPositive: true }}
          color="primary"
          delay={0}
        />
        <StatCard
          title="Tasks Today"
          value="4"
          subtitle="2 in progress"
          icon={ListTodo}
          color="warning"
          delay={0.1}
        />
        <StatCard
          title="Active Habits"
          value="4"
          subtitle="2 completed today"
          icon={Target}
          color="success"
          delay={0.2}
        />
        <StatCard
          title="Study Progress"
          value="68%"
          subtitle="Physics Chapter 5"
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
          color="primary"
          delay={0.3}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Tasks & Habits */}
        <div className="lg:col-span-2 space-y-6">
          <TaskList tasks={mockTasks} />
          <div className="grid md:grid-cols-2 gap-6">
            <HabitTracker habits={mockHabits} />
            <ExpenseChart
              data={mockExpenses}
              total={mockExpenses.reduce((acc, e) => acc + e.value, 0)}
            />
          </div>
        </div>

        {/* Right Column - AI Briefing */}
        <div className="space-y-6">
          <AIBriefing insights={mockInsights} />
          
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-5"
          >
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Add Expense", emoji: "💸" },
                { label: "New Task", emoji: "✅" },
                { label: "Add Note", emoji: "📝" },
                { label: "Track Habit", emoji: "🎯" },
              ].map((action) => (
                <button
                  key={action.label}
                  className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left"
                >
                  <span className="text-lg">{action.emoji}</span>
                  <p className="text-sm font-medium mt-1">{action.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
