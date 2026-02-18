import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────

export interface StudySubject {
    id: string;
    user_id: string;
    name: string;
    color_index: number;
    created_at: string;
}

export interface StudyChapter {
    id: string;
    user_id: string;
    subject_id: string;
    name: string;
    sort_order: number;
    created_at: string;
}

export interface StudyPart {
    id: string;
    user_id: string;
    chapter_id: string;
    name: string;
    status: "not-started" | "in-progress" | "completed";
    estimated_minutes: number;
    scheduled_date?: string;
    scheduled_time?: string;
    notes?: string;
    sort_order: number;
    created_at: string;
    completed_at?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useStudy() {
    const qc = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    // ── Queries ──────────────────────────────────────────────────────

    const subjectsQuery = useQuery<StudySubject[]>({
        queryKey: ["study_subjects", userId],
        queryFn: async () => {
            if (!userId) return [];
            const r = await db.execute({ sql: "SELECT * FROM study_subjects WHERE user_id = ? ORDER BY created_at", args: [userId] });
            return r.rows as unknown as StudySubject[];
        },
        enabled: !!userId,
    });

    const chaptersQuery = useQuery<StudyChapter[]>({
        queryKey: ["study_chapters", userId],
        queryFn: async () => {
            if (!userId) return [];
            const r = await db.execute({ sql: "SELECT * FROM study_chapters_v2 WHERE user_id = ? ORDER BY sort_order, created_at", args: [userId] });
            return r.rows as unknown as StudyChapter[];
        },
        enabled: !!userId,
    });

    const partsQuery = useQuery<StudyPart[]>({
        queryKey: ["study_parts", userId],
        queryFn: async () => {
            if (!userId) return [];
            const r = await db.execute({ sql: "SELECT * FROM study_parts WHERE user_id = ? ORDER BY sort_order, created_at", args: [userId] });
            return r.rows as unknown as StudyPart[];
        },
        enabled: !!userId,
    });

    // ── Derived data ─────────────────────────────────────────────────

    const subjects = subjectsQuery.data ?? [];
    const chapters = chaptersQuery.data ?? [];
    const parts = partsQuery.data ?? [];

    const chaptersBySubject = useMemo(() => {
        const map: Record<string, StudyChapter[]> = {};
        subjects.forEach(s => { map[s.id] = []; });
        chapters.forEach(c => {
            if (!map[c.subject_id]) map[c.subject_id] = [];
            map[c.subject_id].push(c);
        });
        return map;
    }, [subjects, chapters]);

    const partsByChapter = useMemo(() => {
        const map: Record<string, StudyPart[]> = {};
        chapters.forEach(c => { map[c.id] = []; });
        parts.forEach(p => {
            if (!map[p.chapter_id]) map[p.chapter_id] = [];
            map[p.chapter_id].push(p);
        });
        return map;
    }, [chapters, parts]);

    const chapterProgress = useMemo(() => {
        const map: Record<string, number> = {};
        chapters.forEach(c => {
            const cParts = partsByChapter[c.id] || [];
            if (cParts.length === 0) { map[c.id] = 0; return; }
            const done = cParts.filter(p => p.status === "completed").length;
            map[c.id] = Math.round((done / cParts.length) * 100);
        });
        return map;
    }, [chapters, partsByChapter]);

    const subjectProgress = useMemo(() => {
        const map: Record<string, number> = {};
        subjects.forEach(s => {
            const sChapters = chaptersBySubject[s.id] || [];
            const allParts = sChapters.flatMap(c => partsByChapter[c.id] || []);
            if (allParts.length === 0) { map[s.id] = 0; return; }
            const done = allParts.filter(p => p.status === "completed").length;
            map[s.id] = Math.round((done / allParts.length) * 100);
        });
        return map;
    }, [subjects, chaptersBySubject, partsByChapter]);

    // ── Invalidation helper ──────────────────────────────────────────
    const invalidateAll = () => {
        qc.invalidateQueries({ queryKey: ["study_subjects"] });
        qc.invalidateQueries({ queryKey: ["study_chapters"] });
        qc.invalidateQueries({ queryKey: ["study_parts"] });
    };

    // ── Subject mutations ────────────────────────────────────────────

    const addSubject = useMutation({
        mutationFn: async (name: string) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            const colorIndex = subjects.length % 7;
            await db.execute({
                sql: "INSERT INTO study_subjects (id, user_id, name, color_index) VALUES (?, ?, ?, ?)",
                args: [id, userId, name, colorIndex],
            });
            return id;
        },
        onSuccess: invalidateAll,
    });

    const renameSubject = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            await db.execute({ sql: "UPDATE study_subjects SET name = ? WHERE id = ?", args: [name, id] });
        },
        onSuccess: invalidateAll,
    });

    const deleteSubject = useMutation({
        mutationFn: async (id: string) => {
            // CASCADE: delete chapters and parts belonging to this subject
            const subjectChapters = chapters.filter(c => c.subject_id === id);
            for (const ch of subjectChapters) {
                await db.execute({ sql: "DELETE FROM study_parts WHERE chapter_id = ?", args: [ch.id] });
            }
            await db.execute({ sql: "DELETE FROM study_chapters_v2 WHERE subject_id = ?", args: [id] });
            await db.execute({ sql: "DELETE FROM study_subjects WHERE id = ?", args: [id] });
        },
        onSuccess: invalidateAll,
    });

    // ── Chapter mutations ────────────────────────────────────────────

    const addChapter = useMutation({
        mutationFn: async ({ subjectId, name }: { subjectId: string; name: string }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            const order = (chaptersBySubject[subjectId]?.length || 0);
            await db.execute({
                sql: "INSERT INTO study_chapters_v2 (id, user_id, subject_id, name, sort_order) VALUES (?, ?, ?, ?, ?)",
                args: [id, userId, subjectId, name, order],
            });
            return id;
        },
        onSuccess: invalidateAll,
    });

    const renameChapter = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            await db.execute({ sql: "UPDATE study_chapters_v2 SET name = ? WHERE id = ?", args: [name, id] });
        },
        onSuccess: invalidateAll,
    });

    const deleteChapter = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM study_parts WHERE chapter_id = ?", args: [id] });
            await db.execute({ sql: "DELETE FROM study_chapters_v2 WHERE id = ?", args: [id] });
        },
        onSuccess: invalidateAll,
    });

    // ── Part mutations ───────────────────────────────────────────────

    const addPart = useMutation({
        mutationFn: async ({ chapterId, name, estimatedMinutes, scheduledDate, scheduledTime }: {
            chapterId: string; name: string; estimatedMinutes?: number; scheduledDate?: string; scheduledTime?: string;
        }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            const order = (partsByChapter[chapterId]?.length || 0);
            await db.execute({
                sql: "INSERT INTO study_parts (id, user_id, chapter_id, name, estimated_minutes, scheduled_date, scheduled_time, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                args: [id, userId, chapterId, name, estimatedMinutes ?? 30, scheduledDate ?? null, scheduledTime ?? null, order],
            });
            return id;
        },
        onSuccess: invalidateAll,
    });

    const updatePart = useMutation({
        mutationFn: async (update: { id: string; name?: string; estimated_minutes?: number; scheduled_date?: string | null; scheduled_time?: string | null; notes?: string | null }) => {
            const sets: string[] = [];
            const args: unknown[] = [];
            if (update.name !== undefined) { sets.push("name = ?"); args.push(update.name); }
            if (update.estimated_minutes !== undefined) { sets.push("estimated_minutes = ?"); args.push(update.estimated_minutes); }
            if (update.scheduled_date !== undefined) { sets.push("scheduled_date = ?"); args.push(update.scheduled_date); }
            if (update.scheduled_time !== undefined) { sets.push("scheduled_time = ?"); args.push(update.scheduled_time); }
            if (update.notes !== undefined) { sets.push("notes = ?"); args.push(update.notes); }
            if (sets.length === 0) return;
            args.push(update.id);
            await db.execute({ sql: `UPDATE study_parts SET ${sets.join(", ")} WHERE id = ?`, args });
        },
        onSuccess: invalidateAll,
    });

    const togglePartStatus = useMutation({
        mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
            const next = currentStatus === "not-started" ? "in-progress" : currentStatus === "in-progress" ? "completed" : "not-started";
            const completedAt = next === "completed" ? new Date().toISOString() : null;
            await db.execute({
                sql: "UPDATE study_parts SET status = ?, completed_at = ? WHERE id = ?",
                args: [next, completedAt, id],
            });
        },
        onSuccess: invalidateAll,
    });

    const deletePart = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM study_parts WHERE id = ?", args: [id] });
        },
        onSuccess: invalidateAll,
    });

    // ── Aggregate stats ──────────────────────────────────────────────

    const totalParts = parts.length;
    const completedParts = parts.filter(p => p.status === "completed").length;
    const inProgressParts = parts.filter(p => p.status === "in-progress").length;
    const overallProgress = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;

    return {
        // data
        subjects,
        chapters,
        parts,
        chaptersBySubject,
        partsByChapter,
        chapterProgress,
        subjectProgress,
        // stats
        totalParts,
        completedParts,
        inProgressParts,
        overallProgress,
        // loading
        isLoading: subjectsQuery.isLoading || chaptersQuery.isLoading || partsQuery.isLoading,
        // subject mutations
        addSubject,
        renameSubject,
        deleteSubject,
        // chapter mutations
        addChapter,
        renameChapter,
        deleteChapter,
        // part mutations
        addPart,
        updatePart,
        togglePartStatus,
        deletePart,
    };
}
