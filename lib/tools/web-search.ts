import type Anthropic from "@anthropic-ai/sdk";

/**
 * Web search tool for researching competitive landscapes, historical precedents,
 * and current events. Uses Tavily API for search.
 */

export const WEB_SEARCH_TOOL: Anthropic.Tool = {
  name: "search_web",
  description:
    "Search the web for current information about companies, markets, historical context, and trends. Use this to: " +
    "1) Research competitive landscapes (features, pricing, market positioning); " +
    "2) Find historical precedents and lessons from similar transitions; " +
    "3) Ground claims in current market data and real-world examples. " +
    "Example queries: 'AI market share 2026', 'history of technical debt', 'how did AWS launch', 'current AI regulation trends'.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Search query (e.g., 'AI market share 2026', 'history of venture capital', 'current state of cloud computing'). Be specific and concise.",
      },
      num_results: {
        type: "number",
        description: "Number of results to return (1-10, default 5)",
        minimum: 1,
        maximum: 10,
      },
    },
    required: ["query"],
  },
};

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source?: string;
}

/**
 * Execute web search using Tavily API.
 * Requires TAVILY_API_KEY in environment.
 */
export async function runWebSearch(input: {
  query: string;
  num_results?: number;
}): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[Web Search] TAVILY_API_KEY not configured, returning empty results");
    return [];
  }

  const numResults = Math.min(Math.max(input.num_results || 5, 1), 10);

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: input.query,
        max_results: numResults,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      console.warn(`[Web Search] API returned ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      console.warn("[Web Search] Unexpected response format from Tavily API");
      return [];
    }

    return data.results.map((result: any) => ({
      title: String(result.title || ""),
      url: String(result.url || ""),
      snippet: String(result.content || result.snippet || ""),
      publishedDate: result.published_date ? String(result.published_date) : undefined,
      source: result.source ? String(result.source) : undefined,
    }));
  } catch (error) {
    console.error("[Web Search] Error:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Format search results for injection back into conversation.
 * Returns markdown-formatted results with links.
 */
export function formatWebSearchResult(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No search results found for that query.";
  }

  const formatted = results
    .map((r, i) => {
      const dateStr = r.publishedDate ? ` (${r.publishedDate})` : "";
      return `${i + 1}. **${r.title}**${dateStr}\n   ${r.url}\n   ${r.snippet.substring(0, 200)}${r.snippet.length > 200 ? "..." : ""}`;
    })
    .join("\n\n");

  return `**Search Results for: "${results[0]?.snippet ? results[0].snippet.substring(0, 50) : "query"}..."**\n\n${formatted}`;
}

/**
 * Personas with access to web search tool.
 * - Maya: Competitive research and market intelligence
 * - Tomás: Historical precedents and lessons
 * - Eitan: Current events for stress-testing premises
 */
export const WEB_SEARCH_ENABLED_PERSONAS = new Set([
  "maya-krishnan", // Competitive landscape research
  "tomas-rivera", // Historical precedents and lessons
  "eitan-bergmann", // Current market data for reality-checking
]);
