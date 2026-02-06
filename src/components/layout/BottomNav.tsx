import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ListTodo, 
  Wallet, 
  StickyNote, 
  Target
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: ListTodo, label: "Tasks", path: "/tasks" },
  { icon: Wallet, label: "Finance", path: "/finance" },
  { icon: StickyNote, label: "Notes", path: "/notes" },
  { icon: Target, label: "Habits", path: "/habits" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="relative">
              <motion.div
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -bottom-1 w-8 h-1 bg-gradient-primary rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
