import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@libsql/client";
import crypto from "crypto";
import { z } from "zod";
import { sendOtpEmail } from "./smtpService.js";
import { OAuth2Client } from "google-auth-library";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const app = express();
app.use(cors());
app.use(express.json());

const db = createClient({
    url: process.env.VITE_TURSO_DB_URL || "",
    authToken: process.env.VITE_TURSO_AUTH_TOKEN || "",
});

function generateId() {
    return crypto.randomUUID();
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password + "lifeos-salt-v1").digest("hex");
}

// 1. Initial Registration (Creates unverified user + sends OTP)
app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
        const { name, email, password } = z.object({
            name: z.string().min(1),
            email: z.string().email(),
            password: z.string().min(6),
        }).parse(req.body);

        const existing = await db.execute({
            sql: "SELECT id FROM users WHERE email = ?",
            args: [email],
        });

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const id = generateId();
        const passwordHash = hashPassword(password);

        await db.execute({
            sql: "INSERT INTO users (id, name, email, password_hash, is_verified) VALUES (?, ?, ?, ?, 0)",
            args: [id, name, email, passwordHash],
        });

        await db.execute({
            sql: "INSERT INTO settings (id, user_id) VALUES (?, ?)",
            args: [generateId(), id],
        });

        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

        await db.execute({
            sql: "INSERT INTO otps (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)",
            args: [generateId(), email, otp, "registration", expiresAt],
        });

        await sendOtpEmail(email, otp, "registration");

        res.json({ success: true, message: "Registration initiated. Check email for OTP." });
    } catch (error: any) {
        console.error("Register Error:", error);
        res.status(500).json({ error: "Registration failed." });
    }
});

// 2. Verify OTP for Registration
app.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;
        const now = new Date().toISOString();

        const otpResult = await db.execute({
            sql: "SELECT id FROM otps WHERE email = ? AND otp_code = ? AND purpose = 'registration' AND expires_at > ?",
            args: [email, otp, now],
        });

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        await db.execute({
            sql: "UPDATE users SET is_verified = 1 WHERE email = ?",
            args: [email],
        });

        await db.execute({ sql: "DELETE FROM otps WHERE id = ?", args: [otpResult.rows[0].id] });

        const userResult = await db.execute({
            sql: "SELECT id, name, email FROM users WHERE email = ?",
            args: [email],
        });

        res.json({ success: true, user: userResult.rows[0] });
    } catch (error: any) {
        console.error("Verify Error:", error);
        res.status(500).json({ error: "Verification failed." });
    }
});

// 3. Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const passwordHash = hashPassword(password);

        const result = await db.execute({
            sql: "SELECT id, name, email, is_verified FROM users WHERE email = ? AND password_hash = ?",
            args: [email, passwordHash],
        });

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = result.rows[0];

        if (!user.is_verified) {
            const otp = generateOtp();
            const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
            await db.execute({
                sql: "INSERT INTO otps (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)",
                args: [generateId(), email, otp, "registration", expiresAt],
            });
            await sendOtpEmail(email, otp, "registration");

            return res.status(403).json({ error: "Account not verified", requiresVerification: true });
        }

        res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error: any) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// 4. Request Password Reset
app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const userResult = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });

        if (userResult.rows.length > 0) {
            const otp = generateOtp();
            const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
            await db.execute({
                sql: "INSERT INTO otps (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)",
                args: [generateId(), email, otp, "password_reset", expiresAt],
            });
            await sendOtpEmail(email, otp, "password_reset");
        }

        res.json({ success: true, message: "If an account exists, a reset code was sent." });
    } catch (error) {
        console.error("Forgot PW Error:", error);
        res.status(500).json({ error: "Failed to process request" });
    }
});

// 5. Reset Password
app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (newPassword.length < 6) return res.status(400).json({ error: "Password too short" });

        const now = new Date().toISOString();
        const otpResult = await db.execute({
            sql: "SELECT id FROM otps WHERE email = ? AND otp_code = ? AND purpose = 'password_reset' AND expires_at > ?",
            args: [email, otp, now],
        });

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired reset code" });
        }

        const passwordHash = hashPassword(newPassword);
        await db.execute({
            sql: "UPDATE users SET password_hash = ? WHERE email = ?",
            args: [passwordHash, email],
        });

        await db.execute({ sql: "DELETE FROM otps WHERE id = ?", args: [otpResult.rows[0].id] });

        res.json({ success: true, message: "Password reset securely." });
    } catch (error) {
        console.error("Reset PW Error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
});

// 6. Google OAuth Login/Register
const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ error: "No credential provided" });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).json({ error: "Invalid Google token" });
        }

        const email = payload.email;
        const name = payload.name || "Google User";

        const existing = await db.execute({
            sql: "SELECT id, name, email FROM users WHERE email = ?",
            args: [email],
        });

        if (existing.rows.length > 0) {
            await db.execute({
                sql: "UPDATE users SET is_verified = 1 WHERE email = ?",
                args: [email],
            });
            const user = existing.rows[0];
            return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
        } else {
            const id = generateId();
            const randomPassword = crypto.randomBytes(32).toString("hex");
            const passwordHash = hashPassword(randomPassword);

            await db.execute({
                sql: "INSERT INTO users (id, name, email, password_hash, is_verified) VALUES (?, ?, ?, ?, 1)",
                args: [id, name, email, passwordHash],
            });

            await db.execute({
                sql: "INSERT INTO settings (id, user_id) VALUES (?, ?)",
                args: [generateId(), id],
            });

            return res.json({ success: true, user: { id, name, email } });
        }
    } catch (error: any) {
        console.error("Google Auth Error:", error);
        res.status(500).json({ error: "Google Authentication failed" });
    }
});

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Export the Express API for Vercel Serverless Functions
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return app(req as any, res as any);
}
