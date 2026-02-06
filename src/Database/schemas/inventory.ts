import { db } from "../client";

export const inventorySchema = `
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    cost REAL,
    purchase_date TEXT,
    store TEXT
)
`;

export async function initInventoryTable() {
    await db.execute(inventorySchema);
}
