import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIProvider } from "@/contexts/AIContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TasksPage from "./pages/TasksPage";
import FinancePage from "./pages/FinancePage";
import NotesPage from "./pages/NotesPage";
import InventoryPage from "./pages/InventoryPage";
import StudyPage from "./pages/StudyPage";
import HabitsPage from "./pages/HabitsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WelcomePage from "./pages/WelcomePage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { AnimatedPage } from "./components/layout/AnimatedPage";
import { initDatabase } from "./lib/turso";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();

  return (
    <AIProvider>
      <Routes location={location} key={location.pathname.split('/')[1] === 'welcome' || location.pathname.split('/')[1] === 'login' || location.pathname.split('/')[1] === 'register' ? location.pathname : 'dashboard'}>
        {/* Public routes wrapped in individual AnimatePresence/AnimatedPage if needed, but for now let's just use standard routes for them or wrap them */}
        <Route path="/welcome" element={<AnimatedPage><WelcomePage /></AnimatedPage>} />
        <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />
        <Route path="/register" element={<AnimatedPage><RegisterPage /></AnimatedPage>} />

        {/* Protected routes under DashboardLayout */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
      </Routes>
    </AIProvider>
  );
};

const App = () => {
  // Initialize light mode by default
  useEffect(() => {
    const stored = localStorage.getItem("lifeos-theme");
    if (!stored) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("lifeos-theme", "light");
    } else {
      if (stored === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    // Initialize database tables
    initDatabase().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner
            theme="system"
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
            }}
          />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
