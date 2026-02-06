import { db } from "../client";

export const habitsSchema = `
CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    habit_name TEXT NOT NULL,
    streak_count INTEGER DEFAULT 0,
    last_completed_date TEXT
)
`;

export async function initHabitsTable() {
    await db.execute(habitsSchema);
}
