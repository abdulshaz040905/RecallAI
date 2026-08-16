/**
 * @deprecated This module has been replaced by `lib/gemini.ts`.
 *
 * The app no longer uses OpenAI — all embeddings and chat completions run on
 * Google Gemini (free tier). This file only exists so any straggling imports
 * keep working; prefer importing from `@/lib/gemini` directly.
 */
export {
    chatWithAI,
    createEmbedding,
    createManyEmbeddings,
    generateJSON,
    EMBEDDING_DIMENSIONS,
    GEMINI_CHAT_MODEL,
    GEMINI_EMBEDDING_MODEL
} from './gemini'
