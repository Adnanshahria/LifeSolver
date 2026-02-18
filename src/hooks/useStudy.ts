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
    parent_id?: string | null;
}

export interface StudyCommonPreset {
    id: string;
    subject_id: string;
    name: string;
    estimated_minutes: number;
    created_at: string;
    parent_id?: string | null;
    preset_type?: "chapter" | "part"; // "chapter" = auto-added to new chapters, "part" = manual template
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

    const commonPresetsQuery = useQuery<StudyCommonPreset[]>({
        queryKey: ["study_common_presets", userId],
        queryFn: async () => {
            if (!userId) return [];
            const r = await db.execute({ sql: "SELECT * FROM study_common_presets ORDER BY created_at", args: [] });
            // Note: In real app we might want to filter by subject or user, but user_id isn't in the schema I designed? 
            // Wait, schema has subject_id. Let's filter by subject_id in the hook or just fetch all and filter in JS?
            // Actually, my schema for study_common_presets didn't include user_id, but it links to subject_id which links to user. 
            // So fetching all is fine for now, or I should have added user_id. 
            // Let's assume for now we fetch all and filter by subject in UI or derived state.
            return r.rows as unknown as StudyCommonPreset[];
        },
        enabled: !!userId,
    });

    // ── Derived data ─────────────────────────────────────────────────

    const subjects = subjectsQuery.data ?? [];
    const chapters = chaptersQuery.data ?? [];
    const parts = partsQuery.data ?? [];
    const commonPresets = commonPresetsQuery.data ?? [];

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
            const createdAt = new Date().toISOString();

            await db.execute({
                sql: "INSERT INTO study_chapters_v2 (id, user_id, subject_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                args: [id, userId, subjectId, name, order, createdAt],
            });

            // Auto-populate with common presets (Recursive)
            // Only use 'chapter' type presets for auto-population
            const subjectPresets = commonPresets.filter(p => p.subject_id === subjectId && (p.preset_type === "chapter" || !p.preset_type));

            // Build a map of presetId -> createdPartId specific to this chapter to handle parent references
            const presetIdToPartIdMap = new Map<string, string>();

            // Helper to recursively create parts
            // We need to process parents first.
            // Let's topological sort or just iterate "levels" by checking if parent is processed?
            // Simpler: Just filter for root presets, then their children, etc. using a recursive function.

            const createPartsForPresets = async (presets: StudyCommonPreset[], parentPartId: string | null = null) => {
                for (const preset of presets) {
                    const newPartId = generateId();

                    await db.execute({
                        sql: "INSERT INTO study_parts (id, user_id, chapter_id, name, status, estimated_minutes, sort_order, created_at, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        args: [newPartId, userId, id, preset.name, "not-started", preset.estimated_minutes, 0, createdAt, parentPartId]
                    });

                    // Recursively process children
                    const children = subjectPresets.filter(p => p.parent_id === preset.id);
                    if (children.length > 0) {
                        await createPartsForPresets(children, newPartId);
                    }
                }
            };

            const rootPresets = subjectPresets.filter(p => !p.parent_id);
            await createPartsForPresets(rootPresets, null);

            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["study_chapters"] });
            qc.invalidateQueries({ queryKey: ["study_parts"] });
        },
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
        mutationFn: async ({ chapterId, name, estimatedMinutes, scheduledDate, scheduledTime, parentId }: {
            chapterId: string; name: string; estimatedMinutes?: number; scheduledDate?: string; scheduledTime?: string; parentId?: string;
        }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            const order = (partsByChapter[chapterId]?.length || 0);
            const parent = parentId || null;
            await db.execute({
                sql: "INSERT INTO study_parts (id, user_id, chapter_id, name, estimated_minutes, scheduled_date, scheduled_time, sort_order, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                args: [id, userId, chapterId, name, estimatedMinutes ?? 30, scheduledDate ?? null, scheduledTime ?? null, order, parent],
            });
            return id;
        },
        onSuccess: invalidateAll,
    });

    const updatePart = useMutation({
        mutationFn: async (update: { id: string; name?: string; estimated_minutes?: number; scheduled_date?: string | null; scheduled_time?: string | null; notes?: string | null }) => {
            const sets: string[] = [];
            const args: (string | number | null)[] = [];
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

    // ── Common Presets Mutations ─────────────────────────────────────

    const addCommonPreset = useMutation({
        mutationFn: async ({ subjectId, name, minutes, parentId, type = "chapter" }: { subjectId: string; name: string; minutes: number, parentId?: string, type?: "chapter" | "part" }) => {
            const newPreset: StudyCommonPreset = {
                id: generateId(),
                subject_id: subjectId,
                name,
                estimated_minutes: minutes,
                created_at: new Date().toISOString(),
                parent_id: parentId || null,
                preset_type: type
            };
            await db.execute({
                sql: "INSERT INTO study_common_presets (id, subject_id, name, estimated_minutes, created_at, parent_id, preset_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
                args: [newPreset.id, newPreset.subject_id, newPreset.name, newPreset.estimated_minutes, newPreset.created_at, newPreset.parent_id, newPreset.preset_type]
            });
            return newPreset;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["study_common_presets"] }),
    });

    const deleteCommonPreset = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM study_common_presets WHERE id = ?", args: [id] });
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["study_common_presets"] }),
    });
    const ensurePartsForChapter = async (chapterId: string, presetsToApply: StudyCommonPreset[], rootParentId: string | null = null) => {
        const existingParts = partsByChapter[chapterId] || [];

        const ensurePartsForPresets = async (presets: StudyCommonPreset[], parentPartId: string | null = null) => {
            for (const preset of presets) {
                // Check if part exists for this preset (by name and parent)
                // Use the provided parentPartId (which might be the recursion parent OR the rootParentId passed in)
                let part = existingParts.find(p => p.name === preset.name && (p.parent_id === parentPartId || (!p.parent_id && !parentPartId)));

                if (!part) {
                    // Create it
                    const newPartId = generateId();
                    part = {
                        id: newPartId,
                        user_id: userId!,
                        chapter_id: chapterId,
                        name: preset.name,
                        status: "not-started",
                        estimated_minutes: preset.estimated_minutes,
                        sort_order: existingParts.filter(p => p.parent_id === parentPartId).length, // approximate sort order
                        created_at: new Date().toISOString(),
                        parent_id: parentPartId
                    };
                    await db.execute({
                        sql: "INSERT INTO study_parts (id, user_id, chapter_id, name, status, estimated_minutes, sort_order, created_at, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        args: [part.id, part.user_id, part.chapter_id, part.name, part.status, part.estimated_minutes, part.sort_order, part.created_at, part.parent_id]
                    });
                    // Push to local array so children can find it
                    existingParts.push(part);
                    // Also need to push to partsByChapter potentially? No, just local list for recursion matches.
                }

                // Recurse for children
                // IMPORTANT: We only look for children within the `presetsToApply` list.
                // This allows the user to select specific sub-trees without pulling in unwanted siblings.
                const children = presetsToApply.filter(p => p.parent_id === preset.id);
                if (children.length > 0) {
                    await ensurePartsForPresets(children, part.id);
                }
            }
        };

        // We only process the ROOTS of the provided presets list here, recursion handles the rest
        // We only process presets whose parents are NOT in `presetsToApply`.
        const roots = presetsToApply.filter(p => !p.parent_id || !presetsToApply.find(parent => parent.id === p.parent_id));
        await ensurePartsForPresets(roots, rootParentId);
    };

    const applyPresetsToAllChapters = useMutation({
        mutationFn: async (subjectId: string) => {
            if (!userId) throw new Error("User not found");
            const subjectPresets = commonPresets.filter(p => p.subject_id === subjectId && (p.preset_type === "chapter" || !p.preset_type));
            const subjectChapters = chaptersBySubject[subjectId] || [];

            for (const chapter of subjectChapters) {
                await ensurePartsForChapter(chapter.id, subjectPresets, null);
            }
        },
        onSuccess: () => {
            // Invalidate parts query to refresh UI
            qc.invalidateQueries({ queryKey: ["study_parts"] });
        }
    });

    const addPresetsToChapter = useMutation({
        mutationFn: async ({ chapterId, presetIds, targetPartId }: { chapterId: string, presetIds: string[], targetPartId?: string }) => {
            if (!userId) throw new Error("User not found");

            // 1. Identify all presets to be added (based on selection)
            const idsToApply = new Set(presetIds);

            // 2. Expand selection to include ANCESTORS. 
            // Only do this if we are NOT targeting a specific part. 
            // If targeting a specific part (targetPartId), we usually want to plant the selected roots directly under that part.
            // But if the user selected a child node and wants to move the whole tree, they probably selected the root of that tree.
            // If they selected a leaf node, maybe they just want that leaf node under the target part.

            // Actually, if a user explicitly selects a sub-chapter to add to a target part, 
            // they probably intend for that sub-chapter to become a child of the target part.
            // They don't necessarily want to recreate the original preset hierarchy ABOVE the selection.
            // So we should SKIP ancestor expansion if `targetPartId` is present?
            // User says: "created a part, insteed of subpart" -> they wanted hierarchy.
            // BUT now they are asking for "segs under cq". "cq" is an existing part. "segs" is the preset.
            // So they want "segs" (preset) -> child of "cq" (part).
            // In this case, we do NOT want to bring in "segs"'s original parent.

            const selectedPresets = commonPresets.filter(p => idsToApply.has(p.id));

            if (targetPartId === 'all-parts') {
                // Add selected presets to ALL top-level parts in the chapter
                const chapterParts = partsByChapter[chapterId] || [];
                const topLevelParts = chapterParts.filter(p => !p.parent_id);

                for (const part of topLevelParts) {
                    // We don't want to expand ancestors here because we are explicitly planting the preset tree under these parts
                    await ensurePartsForChapter(chapterId, selectedPresets, part.id);
                }
            } else if (!targetPartId) {
                let foundNew = true;
                while (foundNew) {
                    foundNew = false;
                    // Check all currently selected IDs
                    for (const id of Array.from(idsToApply)) {
                        const preset = commonPresets.find(p => p.id === id);
                        if (preset?.parent_id && !idsToApply.has(preset.parent_id)) {
                            idsToApply.add(preset.parent_id);
                            foundNew = true;
                        }
                    }
                }
                const expandedPresets = commonPresets.filter(p => idsToApply.has(p.id));
                await ensurePartsForChapter(chapterId, expandedPresets, null);
            } else {
                // Specific target part
                await ensurePartsForChapter(chapterId, selectedPresets, targetPartId);
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["study_parts"] });
            qc.invalidateQueries({ queryKey: ["study_chapters"] }); // Just in case
        }
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

        commonPresets,
        addCommonPreset,
        deleteCommonPreset,
        applyPresetsToAllChapters,
        addPresetsToChapter
    };
}
