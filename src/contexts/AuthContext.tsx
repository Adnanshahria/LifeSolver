import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db, generateId } from "@/lib/turso";

// Types
interface User {
    id: string;
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "lifeos-salt-v1"); // Add salt
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const storedUserId = localStorage.getItem("lifeos-user-id");
                if (storedUserId) {
                    const result = await db.execute({
                        sql: "SELECT id, name, email FROM users WHERE id = ?",
                        args: [storedUserId],
                    });

                    if (result.rows.length > 0) {
                        const userData = result.rows[0];
                        setUser({
                            id: userData.id as string,
                            name: userData.name as string,
                            email: userData.email as string,
                        });
                    } else {
                        localStorage.removeItem("lifeos-user-id");
                    }
                }
            } catch (error) {
                console.error("Session check failed:", error);
                localStorage.removeItem("lifeos-user-id");
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const passwordHash = await hashPassword(password);
            const result = await db.execute({
                sql: "SELECT id, name, email FROM users WHERE email = ? AND password_hash = ?",
                args: [email, passwordHash],
            });

            if (result.rows.length > 0) {
                const userData = result.rows[0];
                const loggedInUser = {
                    id: userData.id as string,
                    name: userData.name as string,
                    email: userData.email as string,
                };
                setUser(loggedInUser);
                localStorage.setItem("lifeos-user-id", loggedInUser.id);
                return { success: true };
            }
            return { success: false, error: "Invalid email or password" };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, error: "Login failed. Please try again." };
        }
    }, []);

    const register = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            // Check if email already exists
            const existing = await db.execute({
                sql: "SELECT id FROM users WHERE email = ?",
                args: [email],
            });

            if (existing.rows.length > 0) {
                return { success: false, error: "Email already registered" };
            }

            const id = generateId();
            const passwordHash = await hashPassword(password);

            await db.execute({
                sql: "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
                args: [id, name, email, passwordHash],
            });

            // Create default settings for new user
            await db.execute({
                sql: "INSERT INTO settings (id, user_id) VALUES (?, ?)",
                args: [generateId(), id],
            });

            const newUser = { id, name, email };
            setUser(newUser);
            localStorage.setItem("lifeos-user-id", id);
            return { success: true };
        } catch (error) {
            console.error("Registration failed:", error);
            return { success: false, error: "Registration failed. Please try again." };
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem("lifeos-user-id");
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
