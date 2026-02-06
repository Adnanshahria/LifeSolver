import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export interface Note {
    id: string;
    user_id: string;
    title: string;
    content?: string;
    tags?: string;
    created_at: string;
}

export function useNotes() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const notesQuery = useQuery({
        queryKey: ["notes", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC",
                args: [userId],
            });
            return result.rows as unknown as Note[];
        },
        enabled: !!userId,
    });

    const addNote = useMutation({
        mutationFn: async (note: { title: string; content?: string; tags?: string }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            await db.execute({
                sql: "INSERT INTO notes (id, user_id, title, content, tags) VALUES (?, ?, ?, ?, ?)",
                args: [id, userId, note.title, note.content || null, note.tags || null],
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    const updateNote = useMutation({
        mutationFn: async (note: Note) => {
            await db.execute({
                sql: "UPDATE notes SET title = ?, content = ?, tags = ? WHERE id = ?",
                args: [note.title, note.content || null, note.tags || null, note.id],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    const deleteNote = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM notes WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    return {
        notes: notesQuery.data ?? [],
        isLoading: notesQuery.isLoading,
        error: notesQuery.error,
        addNote,
        updateNote,
        deleteNote,
    };
}
