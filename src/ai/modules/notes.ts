// Notes AI Module - handles note actions

import { AIModule, NoteHooks } from '../core/types';

export const NOTE_ACTIONS = [
    "ADD_NOTE",
    "UPDATE_NOTE",
    "DELETE_NOTE",
];

export const NOTE_PROMPT = `NOTE RULES:
For ADD_NOTE, data must include: title (string), content (string), tags (optional, comma-separated string)
For UPDATE_NOTE, data must include: title (string, to find note), and any fields to update: new_title, content, tags
For DELETE_NOTE, data must include: id or title

Note Examples:
- "note: remember to check the oven" → ADD_NOTE with title "Reminder", content "Check the oven"
- "save note meeting at 3pm" → ADD_NOTE with title "Meeting", content "at 3pm"
- "add checklist: buy milk, eggs, bread" → ADD_NOTE with title "Shopping List", content "- [ ] Buy milk\\n- [ ] Eggs\\n- [ ] Bread"
- "update meeting note with new agenda" → UPDATE_NOTE with title "meeting", content "new agenda..."
- "add tags study,important to my physics note" → UPDATE_NOTE with title "physics", tags "study,important"
- "delete the meeting note" → DELETE_NOTE with title "meeting"`;

export async function executeNoteAction(
    action: string,
    data: Record<string, unknown>,
    hooks: NoteHooks
): Promise<void> {
    switch (action) {
        case "ADD_NOTE":
            await hooks.addNote.mutateAsync({
                title: String(data.title || "Quick Note"),
                content: String(data.content || data.title || ""),
                tags: data.tags ? String(data.tags) : undefined,
            });
            break;

        case "UPDATE_NOTE": {
            const noteToUpdate = hooks.notes?.find(n =>
                n.title.toLowerCase().includes((data.title as string || data.id as string || "").toLowerCase())
            );
            if (noteToUpdate) {
                await hooks.updateNote.mutateAsync({
                    ...noteToUpdate,
                    title: data.new_title ? String(data.new_title) : noteToUpdate.title,
                    content: data.content ? String(data.content) : noteToUpdate.content,
                    tags: data.tags !== undefined ? String(data.tags) : noteToUpdate.tags,
                });
            }
            break;
        }

        case "DELETE_NOTE": {
            const noteToDelete = hooks.notes?.find(n =>
                n.title.toLowerCase().includes((data.title as string || data.id as string || "").toLowerCase())
            );
            if (noteToDelete) await hooks.deleteNote.mutateAsync(noteToDelete.id);
            break;
        }
    }
}

export const notesModule: AIModule = {
    name: "notes",
    actions: NOTE_ACTIONS,
    prompt: NOTE_PROMPT,
    execute: executeNoteAction as AIModule['execute'],
};
