/**
 * Phase 3: In-memory knowledge retrieval for persona grounding.
 *
 * Scores each chunk in a persona's knowledge bank by keyword overlap with the
 * user's question, then returns the top-K formatted strings for system prompt
 * injection. No external API — O(n) in-memory per request.
 */

import { PERSONA_KNOWLEDGE_BASE, KnowledgeChunk } from "@/data/persona-knowledge";

// Common words that carry no useful signal for matching
const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "have", "been", "they",
  "will", "what", "when", "how", "are", "not", "but", "can", "you", "your",
  "more", "into", "than", "their", "just", "about", "most", "also", "some",
  "would", "only", "over", "such", "even", "very", "out", "should", "after",
  "all", "one", "which", "each", "other", "any", "them", "then", "these",
  "there", "where", "like", "being", "were", "was", "its", "our", "has",
  "had", "get", "make", "look", "time", "people", "two", "way", "use", "may",
  "said", "long", "great", "good", "need", "before", "back", "know", "first",
  "well", "come", "work", "think", "give", "does", "still", "here", "those",
  "show", "both", "between", "never", "often", "every", "new", "own", "same",
]);

/**
 * Score a single chunk against the tokenized query.
 * Returns a float in [0, 1] — proportion of query words found in the chunk.
 */
function scoreChunk(chunk: KnowledgeChunk, queryWords: string[]): number {
  if (queryWords.length === 0) return 0;
  const searchable = (chunk.content + " " + chunk.tags.join(" ")).toLowerCase();
  const matchCount = queryWords.filter((w) => searchable.includes(w)).length;
  return matchCount / queryWords.length;
}

/**
 * Retrieve the top-K most relevant knowledge chunks for a persona given a question.
 *
 * Returns formatted strings of the form:
 *   "[Source]\nContent text"
 *
 * If the persona has no knowledge bank, returns an empty array.
 * Always returns topK results (lower-scored ones pad if needed), so the
 * system prompt always gets some grounding knowledge even for unrelated queries.
 */
export function retrieveKnowledge(
  personaId: string,
  question: string,
  topK = 4
): string[] {
  const chunks = PERSONA_KNOWLEDGE_BASE[personaId];
  if (!chunks || chunks.length === 0) return [];

  // Tokenize: lowercase, split on non-word chars, remove short words + stop words
  const queryWords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  // Score + sort descending
  const scored = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryWords) }))
    .sort((a, b) => b.score - a.score);

  // Take top K and format
  return scored
    .slice(0, topK)
    .map(({ chunk }) => `[${chunk.source}]\n${chunk.content}`);
}

/**
 * Format retrieved knowledge chunks for injection into a system prompt.
 * Returns an empty string if no chunks provided.
 */
export function formatKnowledgeForPrompt(chunks: string[]): string {
  if (chunks.length === 0) return "";
  return `## GROUNDING KNOWLEDGE\nDraw on these frameworks when directly relevant — reference them explicitly or let them sharpen your perspective. Don't recite them verbatim; use them as the intellectual foundation for your point.\n\n${chunks.join("\n\n")}`;
}
