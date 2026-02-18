// Study AI Module - handles study/chapter/part actions

import { AIModule, StudyHooks } from '../core/types';

export const STUDY_ACTIONS = [
    "ADD_STUDY_SUBJECT",
    "ADD_STUDY_CHAPTER",
    "ADD_STUDY_PART",
    "UPDATE_STUDY_PART_STATUS",
    "DELETE_STUDY_SUBJECT",
    "DELETE_STUDY_CHAPTER",
    "DELETE_STUDY_PART",
];

export const STUDY_PROMPT = `STUDY RULES:
The study system has a hierarchy: Subject → Chapter → Part.
For ADD_STUDY_SUBJECT, data must include: name (string)
For ADD_STUDY_CHAPTER, data must include: subject_name (string to find subject), chapter_name (string)
For ADD_STUDY_PART, data must include: chapter_name (string to find chapter), part_name (string), estimated_minutes (number, default 30)
For UPDATE_STUDY_PART_STATUS, data must include: part_name (string to find part) — it will cycle to the next status
For DELETE_STUDY_SUBJECT, data must include: subject_name (string)
For DELETE_STUDY_CHAPTER, data must include: chapter_name (string)
For DELETE_STUDY_PART, data must include: part_name (string)

Study Examples:
- "add physics subject" → ADD_STUDY_SUBJECT with name "Physics"
- "add chapter waves to physics" → ADD_STUDY_CHAPTER with subject_name "Physics", chapter_name "Waves"
- "add part interference to waves chapter, 45 minutes" → ADD_STUDY_PART with chapter_name "Waves", part_name "Interference", estimated_minutes 45
- "mark interference as done" → UPDATE_STUDY_PART_STATUS with part_name "Interference"
- "delete physics subject" → DELETE_STUDY_SUBJECT with subject_name "Physics"`;

export async function executeStudyAction(
    action: string,
    data: Record<string, unknown>,
    hooks: StudyHooks
): Promise<void> {
    switch (action) {
        case "ADD_STUDY_SUBJECT":
            if (hooks.addSubject) {
                await hooks.addSubject.mutateAsync(String(data.name || ""));
            }
            break;

        case "ADD_STUDY_CHAPTER": {
            const subjectName = String(data.subject_name || "").toLowerCase();
            const subject = hooks.subjects?.find(s => s.name.toLowerCase().includes(subjectName));
            if (subject && hooks.addChapter) {
                await hooks.addChapter.mutateAsync({
                    subjectId: subject.id,
                    name: String(data.chapter_name || data.name || ""),
                });
            }
            break;
        }

        case "ADD_STUDY_PART": {
            const chapterName = String(data.chapter_name || "").toLowerCase();
            const chapter = hooks.chapters?.find(c => c.name.toLowerCase().includes(chapterName));
            if (chapter && hooks.addPart) {
                await hooks.addPart.mutateAsync({
                    chapterId: chapter.id,
                    name: String(data.part_name || data.name || ""),
                    estimatedMinutes: Number(data.estimated_minutes || 30),
                });
            }
            break;
        }

        case "UPDATE_STUDY_PART_STATUS": {
            const partName = String(data.part_name || data.name || "").toLowerCase();
            const part = hooks.parts?.find(p => p.name.toLowerCase().includes(partName));
            if (part && hooks.togglePartStatus) {
                await hooks.togglePartStatus.mutateAsync({ id: part.id, currentStatus: part.status });
            }
            break;
        }

        case "DELETE_STUDY_SUBJECT": {
            const name = String(data.subject_name || data.name || "").toLowerCase();
            const subject = hooks.subjects?.find(s => s.name.toLowerCase().includes(name));
            if (subject && hooks.deleteSubject) {
                await hooks.deleteSubject.mutateAsync(subject.id);
            }
            break;
        }

        case "DELETE_STUDY_CHAPTER": {
            const name = String(data.chapter_name || data.name || "").toLowerCase();
            const chapter = hooks.chapters?.find(c => c.name.toLowerCase().includes(name));
            if (chapter && hooks.deleteChapter) {
                await hooks.deleteChapter.mutateAsync(chapter.id);
            }
            break;
        }

        case "DELETE_STUDY_PART": {
            const name = String(data.part_name || data.name || "").toLowerCase();
            const part = hooks.parts?.find(p => p.name.toLowerCase().includes(name));
            if (part && hooks.deletePart) {
                await hooks.deletePart.mutateAsync(part.id);
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
