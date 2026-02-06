const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Intent parsing response from AI
export interface AIIntent {
    action: string;
    data: Record<string, unknown>;
    response_text: string;
}

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

interface GroqResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
}

const INTENT_PARSER_SYSTEM_PROMPT = `You are LifeOS AI, a helpful assistant that can manage tasks, finance, notes, habits, and study.
You can execute commands or answer questions.

If the user wants to perform an action (add/update/delete/complete), return a JSON object with:
{
  "action": "ACTION_NAME",
  "data": { ...parameters... },
  "response_text": "Confirmation message..."
}

Available actions:
TASKS: ADD_TASK, UPDATE_TASK, DELETE_TASK, COMPLETE_TASK
FINANCE: ADD_EXPENSE, ADD_INCOME, DELETE_EXPENSE
NOTES: ADD_NOTE, DELETE_NOTE
HABITS: ADD_HABIT, COMPLETE_HABIT, DELETE_HABIT
INVENTORY: ADD_INVENTORY, DELETE_INVENTORY
STUDY: ADD_STUDY_CHAPTER, UPDATE_STUDY_PROGRESS, DELETE_STUDY_CHAPTER

If the user asks a question or wants to chat (e.g. "How is my budget?", "Tell me a joke"), return:
{
  "action": "CHAT",
  "data": {},
  "response_text": "Your helpful answer here..."
}

Keep responses concise and friendly. Use Bengali currency (৳) for money.
Always return valid JSON.`;

export async function processUserMessage(
    userMessage: string,
    history: ChatMessage[] = [],
    context?: string
): Promise<AIIntent> {
    // Prepare conversation history for the API
    // We limit history to last 10 messages to save context window
    const recentHistory = history.slice(-10);

    const systemPromptWithContext = context
        ? `${INTENT_PARSER_SYSTEM_PROMPT}\n\nCURRENT APP CONTEXT:\n${context}`
        : INTENT_PARSER_SYSTEM_PROMPT;

    const messages: ChatMessage[] = [
        { role: "system", content: systemPromptWithContext },
        ...recentHistory,
        { role: "user", content: userMessage },
    ];

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages,
                temperature: 0.3,
                max_tokens: 512,
                response_format: { type: "json_object" } // Force JSON mode
            }),
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }

        const data: GroqResponse = await response.json();
        const content = data.choices[0]?.message?.content || "{}";

        // Parse the JSON response
        const parsed = JSON.parse(content) as AIIntent;
        return parsed;
    } catch (error) {
        console.error("AI Processing error:", error);
        return {
            action: "CHAT",
            data: {},
            response_text: "Sorry, I encountered an error processing your request. Please try again.",
        };
    }
}

// Deprecated: kept for compatibility if needed, but processUserMessage is preferred
export const parseIntent = (msg: string) => processUserMessage(msg);
export const askAI = (msg: string) => processUserMessage(msg).then(r => r.response_text);

// Analyze budget based on finance data
export async function analyzeBudget(
    expenses: { category: string; amount: number }[],
    income: number
): Promise<string> {
    const expensesByCategory = expenses.reduce(
        (acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        },
        {} as Record<string, number>
    );

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const prompt = `Analyze this budget data and give brief advice:
Income: ৳${income}
Total Expenses: ৳${totalExpenses}
Expenses by category: ${JSON.stringify(expensesByCategory)}
Remaining: ৳${income - totalExpenses}

Give 2-3 short tips.`;

    return askAI(prompt);
}

// Get daily briefing
export async function getDailyBriefing(data: {
    tasksCount: number;
    habitsCompleted: number;
    habitsTotal: number;
    budgetUsed: number;
    budgetTotal: number;
}): Promise<string> {
    const prompt = `Generate a brief, encouraging daily briefing. Stats: ${data.tasksCount} tasks today, ${data.habitsCompleted}/${data.habitsTotal} habits done, ৳${data.budgetUsed}/৳${data.budgetTotal} budget used. Keep it under 50 words.`;
    return askAI(prompt);
}

// Get study tips for a subject
export async function getStudyTips(subject: string): Promise<string> {
    const prompt = `Give me 3 quick, practical study tips for learning ${subject}. Keep each tip to 1-2 sentences.`;
    return askAI(prompt);
}
