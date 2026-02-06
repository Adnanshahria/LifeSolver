import { db } from "../client";

export const studySchema = `
CREATE TABLE IF NOT EXISTS study_chapters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    chapter_name TEXT NOT NULL,
    progress_percentage INTEGER DEFAULT 0,
    status TEXT DEFAULT 'not-started'
)
`;

export async function initStudyTable() {
    await db.execute(studySchema);
}
