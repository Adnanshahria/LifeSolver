// Study AI Module - handles study/chapter actions

import { AIModule, StudyHooks } from '../core/types';

export const STUDY_ACTIONS = [
    "ADD_STUDY_CHAPTER",
    "UPDATE_STUDY_PROGRESS",
    "DELETE_STUDY_CHAPTER",
    "SEND_STUDY_TO_TASKS",
];

export const STUDY_PROMPT = `STUDY RULES:
For ADD_STUDY_CHAPTER, data must include: subject (string), chapter_name (string)
For UPDATE_STUDY_PROGRESS, data must include: chapter_name or id (to find chapter), progress_percentage (number 0-100)
For DELETE_STUDY_CHAPTER, data must include: chapter_name or id
For SEND_STUDY_TO_TASKS, data must include: chapter_name or id (creates a study task in the Tasks page)

Study Examples:
- "add chapter waves from physics" → ADD_STUDY_CHAPTER with subject "Physics", chapter_name "Waves"
- "I finished 80% of calculus chapter" → UPDATE_STUDY_PROGRESS with chapter_name "calculus", progress_percentage 80
- "delete the optics chapter" → DELETE_STUDY_CHAPTER with chapter_name "optics"
- "send thermodynamics to my tasks" → SEND_STUDY_TO_TASKS with chapter_name "thermodynamics"`;

export async function executeStudyAction(
    action: string,
    data: Record<string, unknown>,
    hooks: StudyHooks
): Promise<void> {
    switch (action) {
        case "ADD_STUDY_CHAPTER":
            await hooks.addChapter.mutateAsync({
                subject: String(data.subject || "General"),
                chapter_name: String(data.chapter_name || data.title || ""),
            });
            break;

        case "UPDATE_STUDY_PROGRESS": {
            const searchTerm = String(data.chapter_name || data.title || data.id || "").toLowerCase();
            const chapterToUpdate = hooks.chapters?.find(c =>
                c.chapter_name.toLowerCase().includes(searchTerm) ||
                c.subject.toLowerCase().includes(searchTerm)
            );
            if (chapterToUpdate) {
                await hooks.updateProgress.mutateAsync({
                    id: chapterToUpdate.id,
                    progress_percentage: Number(data.progress_percentage || 0),
                });
            }
            break;
        }

        case "DELETE_STUDY_CHAPTER": {
            const searchTerm = String(data.chapter_name || data.title || data.id || "").toLowerCase();
            const chapterToDelete = hooks.chapters?.find(c =>
                c.chapter_name.toLowerCase().includes(searchTerm) ||
                c.subject.toLowerCase().includes(searchTerm)
            );
            if (chapterToDelete) await hooks.deleteChapter.mutateAsync(chapterToDelete.id);
            break;
        }

        case "SEND_STUDY_TO_TASKS": {
            const searchTerm = String(data.chapter_name || data.title || data.id || "").toLowerCase();
            const chapterToSend = hooks.chapters?.find(c =>
                c.chapter_name.toLowerCase().includes(searchTerm) ||
                c.subject.toLowerCase().includes(searchTerm)
            );
            if (chapterToSend && hooks.createStudyTask) {
                await hooks.createStudyTask({
                    chapter: chapterToSend,
                    dueDate: new Date().toISOString().split("T")[0],
                    estimatedDuration: 60,
                });
            }
            break;
        }
    }
}

export const studyModule: AIModule = {
    name: "study",
    actions: STUDY_ACTIONS,
    prompt: STUDY_PROMPT,
    execute: executeStudyAction as AIModule['execute'],
};
