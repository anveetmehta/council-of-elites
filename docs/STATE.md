# Council of Elites — Current State vs Ideal State

A strategic snapshot of where the product is and where it's heading. Updated as we ship.

---

## 1. Conversation Architecture

### Current State
The core advisory pipeline runs in 4 phases:

| Phase | What happens | Latency budget |
|---|---|---|
| **0. Stance priming** (silent) | Parallel Haiku calls — one per persona — generate each advisor's instinctive committed position on the question. Used as anti-sycophancy anchor + stance map. | ~1.5s |
| **0.5 Scoping** (conditional) | If `classifyNeedsScoping(question)` returns true (vague question), one persona — preferentially the Sharp Contrarian → Strategic Leader → critic — names what's missing and states working assumptions. Skips on follow-ups. | ~3s |
| **1. Initial takes** | Each non-moderator persona streams their take, in shuffled order. Last speaker gets a "land it" cue; earlier speakers get adjacency-pair forcing (set up the next person). | ~3-5s per persona |
| **2. Reactions** | Director routes 1-2 inter-advisor reactions based on move classification (PROPOSAL/CHALLENGE/QUESTION/BUILD/etc.). Each reaction uses targeted context — only relevant prior turns + scoping + initial takes. | ~3-5s per turn |
| **2.5 Handoff** | The final reaction is overridden: speak directly to the user, name the tension, end with a specific answerable question. UI marks this card with "Over to you" + glow. | ~3s |
| **3. Wrap-up** | Moderator (if present) or auto-summary; session artifact ("you came in with → walking out with → key decision"); follow-up chips (rendered as quick-reply options when conversation ended with a handoff). | ~5s parallel |

### Ideal State
- **Real-time interrupts.** User can interrupt a streaming advisor mid-turn to ask "wait, what do you mean?" — currently the user has to wait for the full round to complete.
- **Adaptive Phase 2 length.** Director should be able to extend reactions if the disagreement is generative, or cut short if it's repetitive. Today it's a fixed cap (1-2 + handoff).
- **Multi-round memory of stances.** Across sessions, each advisor remembers what stance they took on prior topics for this user — so a Munger who told them to bootstrap in March can call back to that in June.
- **Cross-question knowledge synthesis.** Today each question is its own pipeline. Ideal: a session-level model that sees the arc of multiple questions and surfaces patterns ("you keep circling the same career fear").

---

## 2. UX / User Flow

### Current State
- **First-run funnel**: Landing → topic input → login → builder (3 progressive tiers: recommended council / customize / advanced) → first question auto-fires
- **Returning user**: Home shows "Continue thinking" with last 3 sessions + question count
- **In-session**:
  - Section dividers ("Setting context" / "Takes" / "Reactions")
  - Scoping card (amber badge, muted)
  - Initial-take cards (left-bordered by persona color)
  - Reaction cards
  - Handoff card (accent glow, "Over to you" badge, "↓ Answer below")
  - Input box glows + placeholder switches when handoff lands
  - Quick-reply chips as possible answers to handoff
- **History**: Sessions list with last question + count + advisor names
- **Patterns** (analytics): Top consulted advisors, "advisors who know you" (memory threshold ≥3), recent questions, memory narrative ("what your advisors see in you")
- **Advisor pages**: Per-advisor detail page with session history, memory count, frameworks
- **Share**: Public read-only link at /share/[id]

### Ideal State
- **Conversation map** — sidebar or hover view showing the structure of the current conversation (who's spoken, what move was classified, where you are in the arc). Helps users follow longer conversations.
- **"Compare to last time"** on returning sessions — show how today's question relates to past ones the user asked the same advisor.
- **Voice / spoken-mode** — for users who want to drive while consulting. Single mic + TTS for each persona with distinct voice characters.
- **Mobile-first input affordances** — quick-reply chips are good; we need a horizontal scroll, larger tap targets, and a "hold to record" voice option.
- **Streaming-aware loading states** — a current pause-while-thinking is just dots. Ideal: each persona's thinking gets a tiny per-persona indicator (e.g., "Munger is checking the numbers...").

---

## 3. Persona System

### Current State
- **2 tiers**: archetypes (Strategic Leader, Empathetic Coach, Sharp Contrarian, Creative Builder, Reflective Philosopher) and domain experts (Naval-style, Munger-style, Buffett-style, PG-style, etc.)
- **Each persona has**: name, tagline, archetype, colorHex, description, traits, icon, introduction, narrative, knownFor, askAbout, systemPrompt
- **Framework toolkits** injected per archetype in `ARCHETYPE_FRAMEWORKS` (lib/anthropic/prompts.ts)
- **Knowledge packs** in `data/persona-knowledge.ts` provide retrieval context per persona
- **Memory** per persona — observations + reflections accumulated across user sessions

### Ideal State
- **User-customizable personas** — let users create their own ("My old boss Raj who would say 'show me the unit economics'") with examples that train the voice
- **Persona evolution** — personas get sharper at advising a specific user over time as memory accumulates. Today this is implicit; ideal makes it visible ("Munger has 12 reflections about your decision-making style")
- **Persona-to-persona relationships** — Munger should know how Naval thinks (and vice versa) for richer cross-references. Today they only know names + taglines.
- **Voice samples per domain expert** — the AI-inspired personas should feel even more distinct via more concrete language patterns scraped from interviews/essays.
- **More frameworks per archetype** — currently 6-9 named frameworks per archetype. Could be 15-20 with more specific ones.

---

## 4. Memory & Continuity

### Current State
- **Memory entries**: stored in `memory_entries` table with `user_id`, `persona_id`, `content`, `importance` (1-10), `memory_type` ("observation" | "reflection")
- **Extraction**: After each round, `extractMemoryEntries` runs a Haiku call per persona to pull 2-3 specific observations
- **Reflection synthesis**: Every 8 observations, `synthesizeReflection` consolidates them into higher-order insights
- **Retrieval**: At each round start, `fetchPersonaMemories` pulls top 8 by importance; injected into the persona's system prompt
- **"Knows you" badge**: shown when memory count ≥3

### Ideal State
- **User-level model**: A top-level summary of the user across all advisors — "you keep asking about career changes" — surfaced in the Patterns page as a narrative the user can edit/correct
- **Visible memory** — let users see (and delete) what each advisor remembers about them. Privacy-first.
- **Memory-aware first message** — when a returning user starts a new session, the council should reference relevant past context ("Last time we talked about the SaaS scaling question — has the channel saturated?")
- **Cross-persona memory sharing** — when Munger learns something about the user, Naval should benefit too (with consent). Today memory is per-persona-silo.
- **Memory decay / refresh** — old memories should fade unless they're reaffirmed.

---

## 5. Tech / Code Quality

### Current State (snapshot after this refactor)
- **lib/anthropic/**:
  - `client.ts` (12 lines) — singleton Anthropic SDK client
  - `prompts.ts` (182 lines) — SHARED_PREAMBLE, ARCHETYPE_FRAMEWORKS, ROLE_INJECTIONS, buildSystemPrompt, stripMarkdownEmphasis
  - `safety.ts` (27 lines) — checkInputSafety
  - `council.ts` (831 lines, was 1079) — stances, scoping, director, move classification, streamPersonaWithHistory, streamReactionTurn, streamModerator, summaries, session artifact, follow-up chips
- **app/api/council/route.ts** (742 lines) — Phase 0 (scoping) → Phase 1 (initial) → Phase 2 (reactions + handoff) → Phase 3 (wrap-up) via SSE streaming
- **app/(app)/council/[roomId]/page.tsx** (545 lines) — React UI for streaming consumption
- **hooks/useCouncil.ts** (340 lines) — SSE event handler, accumulator, optimistic updates
- **scripts/eval-council.ts** (525 lines) — offline evaluator with anchor/handoff/scope detection
- **TypeScript strict mode** — passes cleanly with 0 errors

### Ideal State
- **council.ts further split**:
  - `stances.ts` — generateCommittedStance, generateAllStances
  - `scoping.ts` — classifyNeedsScoping, streamScopingTurn
  - `director.ts` — MoveType, classifyMove, callDirector
  - `turns.ts` — streamPersonaWithHistory, streamReactionTurn
  - `moderator.ts` — streamModerator
  - `summaries.ts` — generateAutoSummary, generateConversationSummary, generateCouncilTitle, generateFollowUpChips
  - `artifacts.ts` — generateSessionArtifact
  - `council.ts` becomes the public facade — re-exports + types only
- **Options objects** instead of long positional parameter lists. `streamPersonaWithHistory` currently takes 12 positional params — that's a refactor footgun.
- **Route handler decomposition** — `runScopingPhase()`, `runInitialPhase()`, `runReactionPhase()`, `runWrapUpPhase()` as separate functions. Today the route is one 742-line streaming function.
- **Test coverage**: only `scripts/eval-council.ts` exists as a quality-check tool. We need:
  - Unit tests for prompt builders (snapshot tests)
  - Integration tests for the route handler with mocked SDK
  - Regression tests for SSE event emission order
- **Telemetry**: no structured logs on Phase timings, persona response quality, handoff rate. Would help us catch regressions in prod.

---

## 6. Eval & Quality Loop

### Current State
- **scripts/eval-council.ts** runs 6 scenarios (vague + specific + multi-round) and flags per-turn issues: ⚓anchor, 🔍scope, ↩callback, 🎯HANDOFF
- **Current pass rate**: 39/40 turns clean (97.5%)
- **Manual checks**: visual review of generated transcripts
- **Production feedback**: thumbs up/down on each completed message (FeedbackForm)

### Ideal State
- **Automated eval on PR** — CI runs the eval against a fixed scenario set; flags regressions in anchor/handoff rate.
- **Quality dashboard** — show aggregate metrics per week: average words/turn, % turns with anchor, handoff completion rate, % conversations where user replied to handoff.
- **A/B prompt testing** — split traffic between two SHARED_PREAMBLE variants; measure downstream engagement.
- **Real user feedback loop** — when a user thumbs-down a turn, that turn's full context goes into a "bad examples" set that informs prompt iteration.

---

## 7. Product Surface

### Current State (features shipped)
- Landing page with topic threading
- 3-tier council builder (recommended / customize / advanced)
- Live streaming conversation with structured phases
- @mention to address specific advisor
- Hand-raise to direct who speaks next
- Session history + share links + advisor detail pages
- Memory + reflection layer
- Knowledge retrieval (RAG) per persona
- Settings + sign-out
- Disclaimer banner for domain experts

### Ideal State (features missing)
- **Real-time chat with the council** — currently a question → batch round → wait. Ideal: persistent chat where the user can interject, ask one advisor a side question, etc.
- **Saved frameworks/playbooks** — when the council surfaces a useful framework ("inversion"), let the user save it to their personal playbook
- **Multi-advisor session continuity** — bring the same council back to a topic from 2 weeks ago and have them remember
- **Recommendation engine improvements** — currently emotional-register classifier; ideal also uses memory ("you've talked to Munger 4 times — try Naval this time?")
- **Public expert ratings / endorsement** — let users mark which advisor frames helped most; surface this on the advisor profile

---

## 8. Priorities (next 4 weeks)

Ranked by leverage:

1. **Real user testing in prod** — the architecture is sound; ship it, watch what breaks, fix the actual reported issues
2. **Finish refactor** — split council.ts further, convert long parameter lists to options objects, decompose route.ts phase handlers
3. **Saved playbook + framework bookmarks** — small surface, high engagement (gives users something to take away)
4. **Cross-persona memory sharing** — opt-in toggle in Settings; unlocks the "council that knows you" feeling
5. **CI eval gate** — wire `scripts/eval-council.ts` into a GitHub Action that runs on every PR

### Lower priority (good to have, not blocking)
- Voice / TTS personas
- Conversation map sidebar
- A/B prompt testing infrastructure
- Quality dashboard

---

## Recent changes (chronological)

- **Phase A (funnel)**: landing → login topic threading → 3-tier builder → auto-fired first question
- **Phase B (organic conversation)**: stance priming, adjacency pairs, move classification, conditional relevance, targeted context, anti-sycophancy
- **Phase C (continuity)**: enriched sessions list, patterns/insights page, advisor detail pages, share links
- **Phase D (polish)**: "Over to you" handoff turn, removed "naturally" label, hand-raise panel polished, session artifact prominence
- **Phase E (richer conversation)**:
  - Frameworks invoked by name per archetype
  - Anchor requirement (number / framework / pattern / clarifying-Q)
  - Honest scoping ("I don't know X, assuming Y")
  - Variable response length (10-80 words)
  - Phase 0 scoping turn for vague questions
  - Long-conversation callbacks (Phase 1 takes always in context window)
  - Handoff `?` enforcement
  - UI: scoping badge, "Over to you" handoff card, input glow, quick-reply chips

**Eval scorecard progression**: ~30% → 65% → 80% → 85% → **97.5%**
