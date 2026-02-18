import { db } from "../client";

export const studySubjectsSchema = `
CREATE TABLE IF NOT EXISTS study_subjects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_index INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
)
`;

export const studyChaptersSchema = `
CREATE TABLE IF NOT EXISTS study_chapters_v2 (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES study_subjects(id) ON DELETE CASCADE
)
`;

export const studyPartsSchema = `
CREATE TABLE IF NOT EXISTS study_parts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'not-started',
    estimated_minutes INTEGER DEFAULT 30,
    scheduled_date TEXT,
    scheduled_time TEXT,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (chapter_id) REFERENCES study_chapters_v2(id) ON DELETE CASCADE
)
`;

export async function initStudyTable() {
    await db.execute(studySubjectsSchema);
    await db.execute(studyChaptersSchema);
    await db.execute(studyPartsSchema);
}
