import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Thứ tự ưu tiên (tuỳ dự án bạn chỉnh)
const PREFERRED_MODELS = [
    process.env.GEMINI_MODEL,                // ưu tiên .env
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
].filter(Boolean);

// REST liệt kê model khả dụng cho key hiện tại
async function listAvailableModels() {
    const res = await fetch(
        'https://generativelanguage.googleapis.com/v1/models?key=' + process.env.GEMINI_API_KEY
    );
    if (!res.ok) throw new Error(`ListModels failed ${res.status}`);
    const data = await res.json();
    return (data.models ?? []).map(m => m.name);
}

export async function getModel(exclude = []) {
    const available = await listAvailableModels();     // ví dụ: ["models/gemini-2.5-flash", ...]
    const names = new Set(available.map(n => n.replace(/^models\//, '')));

    const picked = PREFERRED_MODELS.find(m => names.has(m) && !exclude.includes(m));
    if (!picked) {
        throw new Error(`No preferred model available. Found: ${[...names].join(', ')}`);
    }

    console.log(`🔎 Using Gemini model: ${picked}`);
    return genAI.getGenerativeModel({ model: picked });
}

export { PREFERRED_MODELS };
