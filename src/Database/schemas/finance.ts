import { db } from "../client";

export const financeSchema = `
CREATE TABLE IF NOT EXISTS finance (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP
)
`;

export async function initFinanceTable() {
    await db.execute(financeSchema);
}
