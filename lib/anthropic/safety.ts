/**
 * Input safety checking — runs before the council pipeline accepts a question.
 *
 * Returns true if the question is safe to process, false if it should be rejected.
 * Uses a cheap Haiku classifier; tuned to be conservative (default to safe on error).
 */

import { getAnthropicClient } from "./client";

export async function checkInputSafety(question: string): Promise<boolean> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 5,
    messages: [
      {
        role: "user",
        content: `Does the following question ask for anything harmful, dangerous, illegal, or clearly unethical? Answer only YES or NO.\n\nQuestion: "${question}"`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") return true;
  return !content.text.trim().toUpperCase().startsWith("YES");
}
