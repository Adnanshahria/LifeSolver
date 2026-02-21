import nodemailer from "nodemailer";

// Create a transporter using environment variables
// Vercel injects env vars automatically in production
const transporter = nodemailer.createTransport({
    host: process.env.VITE_SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.VITE_SMTP_PORT || "587"),
    secure: process.env.VITE_SMTP_SECURE === "true",
    auth: {
        user: process.env.VITE_SMTP_USER || "",
        pass: process.env.VITE_SMTP_PASS || "",
    },
});

export async function sendOtpEmail(to: string, otp: string, purpose: "registration" | "password_reset") {
    const subject = purpose === "registration"
        ? "Welcome to LifeHub AI - Verify Your Email"
        : "LifeHub AI - Password Reset Request";

    const message = purpose === "registration"
        ? `Thank you for registering at LifeHub AI!\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.`
        : `We received a request to reset your password.\n\nYour reset code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`;

    try {
        await transporter.sendMail({
            from: `"LifeHub AI" <${process.env.VITE_SMTP_USER || "noreply@lifehub.ai"}>`,
            to,
            subject,
            text: message,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0c4a6e;">LifeHub AI</h2>
        <p>${purpose === "registration" ? "Thank you for registering!" : "We received a password reset request."}</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #166534;">Your one-time code is</p>
          <h1 style="margin: 10px 0 0; font-size: 32px; letter-spacing: 5px; color: #166534;">${otp}</h1>
        </div>
        <p style="color: #64748b; font-size: 12px;">This code expires in 10 minutes. Please do not share this with anyone.</p>
      </div>`,
        });
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}
