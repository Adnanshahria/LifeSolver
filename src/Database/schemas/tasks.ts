import { db } from "../client";

export const tasksSchema = `
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    due_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`;

export async function initTasksTable() {
    await db.execute(tasksSchema);
}
