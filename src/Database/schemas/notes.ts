import { db } from "../client";

export const notesSchema = `
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`;

export async function initNotesTable() {
    await db.execute(notesSchema);
}
