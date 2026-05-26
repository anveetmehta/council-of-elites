/**
 * Per-persona knowledge bank for the 8 SME advisors.
 *
 * Each chunk is a synthesized insight from the persona's domain, written in
 * their intellectual tradition, with real-source attribution and keyword tags
 * for retrieval.
 *
 * Format: Record<personaId, KnowledgeChunk[]>
 * Retrieved by lib/knowledge.ts via keyword scoring against the user's question.
 */

export interface KnowledgeChunk {
  id: string;
  content: string;
  source: string;
  tags: string[];
}

export type PersonaKnowledgeBank = Record<string, KnowledgeChunk[]>;

export const PERSONA_KNOWLEDGE_BASE: PersonaKnowledgeBank = {

  // ─────────────────────────────────────────────────────────────────
  // MAYA KRISHNAN — The Strategist
  // ─────────────────────────────────────────────────────────────────
  "maya-krishnan": [
    {
      id: "maya-1",
      content: "The most dangerous strategic mistake isn't choosing the wrong option — it's optimizing the wrong game. Companies routinely build competitive moats in markets that are being outflanked at a different layer. Before asking 'how do we win this competition,' ask whether winning this particular competition produces the outcome you actually want. The best strategists define the game before playing it.",
      source: "Competitive strategy — Porter, Jobs-to-be-Done theory",
      tags: ["strategy", "competition", "market", "positioning", "moat", "competitive advantage"],
    },
    {
      id: "maya-2",
      content: "Second-order effects are where strategies succeed or fail. A price cut increases volume — that's first order. Volume increase causes a supply chain bottleneck, which damages key customer relationships — that's second order. Anyone can think to move 2; the skill is thinking to move 3 and 4. In competitive dynamics, the most valuable analysis is modeling what your competitors will do in response to your move — and what options that leaves you.",
      source: "Game theory — Thomas Schelling, competitive dynamics research",
      tags: ["second order", "game theory", "competitive response", "strategy", "decision"],
    },
    {
      id: "maya-3",
      content: "Timing is a strategic variable, not an external constraint. The question is never just 'should we do X?' but 'should we do X now, before others, or after the market validates?' Moving first creates options but burns capital proving the category. Moving second captures a proven market but faces an entrenched incumbent. The right timing depends on your resource advantage, your learning rate versus competitors, and how fast the market's needs are shifting.",
      source: "First-mover advantage research — market entry strategy literature",
      tags: ["timing", "first mover", "market entry", "competition", "when to move"],
    },
    {
      id: "maya-4",
      content: "Power in negotiations, partnerships, and acquisitions comes from alternatives, not from pressure. The side with the best outside option sets the terms. Before any high-stakes conversation, map both parties' alternatives — their BATNA. If your BATNA is weak, strengthen it first. If theirs is weak, understand it so you don't accidentally make concessions you don't need to make.",
      source: "Negotiation theory — Fisher & Ury, Getting to Yes",
      tags: ["negotiation", "leverage", "BATNA", "partnership", "deal", "power"],
    },
    {
      id: "maya-5",
      content: "Organizational strategy fails most often at the translation layer between vision and daily decisions. A clear strategy at the top means nothing if the people making hundreds of small decisions daily don't have a framework for making them consistently. The test of a real strategy is whether a frontline employee can use it to make a decision without escalating. If they can't, it's not a strategy — it's an aspiration.",
      source: "Strategy execution — Roger Martin, Playing to Win",
      tags: ["execution", "organizational strategy", "alignment", "leadership", "decisions"],
    },
    {
      id: "maya-6",
      content: "Platform strategy is about controlling a critical bottleneck while enabling an ecosystem — and the bottleneck that matters most is the one hardest to replicate. The best platform moats aren't technical; they're network effects combined with switching costs. When evaluating a platform play, ask: what is the thing that becomes more valuable as more participants join, and who controls it?",
      source: "Platform strategy — Sangeet Paul Choudary, Platform Revolution",
      tags: ["platform", "network effects", "ecosystem", "marketplace", "strategy"],
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // DANIEL OKAFOR — The Operator
  // ─────────────────────────────────────────────────────────────────
  "daniel-okafor": [
    {
      id: "daniel-1",
      content: "The most expensive engineering decision is building the wrong thing at high quality. Speed to learning beats speed to shipping. An MVP's job isn't to be a minimal version of the final product — it's to answer the most important unresolved question with the least investment. What breaks most early-stage products is falling in love with a solution before confirming the problem exists and is painful enough to pay for.",
      source: "Lean startup methodology — Eric Ries, Steve Blank",
      tags: ["MVP", "build", "product", "startup", "shipping", "learning", "validation"],
    },
    {
      id: "daniel-2",
      content: "Technical debt is a real financial liability. The compound interest on deferred architectural decisions hits hardest when you're scaling fast and have no time to refactor. The teams that handle scale best make explicit decisions about where to incur debt (velocity-critical paths) and where not to (data models, API contracts, auth). The problem isn't having debt; it's having hidden debt you discover in production.",
      source: "Software engineering practice — Martin Fowler, refactoring and technical debt literature",
      tags: ["technical debt", "engineering", "architecture", "scale", "refactor", "systems"],
    },
    {
      id: "daniel-3",
      content: "Hiring the wrong first 10 engineers is harder to recover from than most funding mistakes. At early stages, hire for density of skill over breadth. One exceptional generalist engineer who can ship across the stack is worth three specialists who can't work outside their lane. Work sample tests beat whiteboarding on algorithms 90% of the time.",
      source: "Engineering leadership — Will Larson, An Elegant Puzzle",
      tags: ["hiring", "engineering", "team", "early stage", "startup", "talent"],
    },
    {
      id: "daniel-4",
      content: "Build what differentiates you and buy everything else. If a vendor offers 80% of what you need and the remaining 20% doesn't affect your core competitive advantage, buy it. Your engineering time is your most finite resource. Teams default to building because it feels like control — but control comes with maintenance cost, opportunity cost, and distraction from your core product.",
      source: "Product engineering strategy — build vs. buy decision frameworks",
      tags: ["build vs buy", "engineering", "product", "decisions", "technical", "vendor"],
    },
    {
      id: "daniel-5",
      content: "Systems break at 10x scale in predictable ways. The bottlenecks are almost always: the database query that worked fine at 100 users becomes the chokepoint at 100,000; synchronous processes that need to become async; monolith components that need to decouple. You don't need to solve 10x on day one — but you should know which components will break first and have a sketch of how you'd address them.",
      source: "Systems engineering — high scalability practice, The Art of Scalability",
      tags: ["scale", "systems", "engineering", "architecture", "bottleneck", "growth"],
    },
    {
      id: "daniel-6",
      content: "Scope is a negotiation, not a list of requirements. Every feature added to a sprint is a vote to not ship something else. 'We can't do that now' is a product strategy. The teams that ship consistently aren't the ones with the most resources — they're the ones most ruthless about what goes in this sprint versus next quarter.",
      source: "Product management — Marty Cagan, Inspired; Shape Up methodology",
      tags: ["product", "scope", "prioritization", "shipping", "roadmap", "sprint"],
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // HANA MORI — The Numbers
  // ─────────────────────────────────────────────────────────────────
  "hana-mori": [
    {
      id: "hana-1",
      content: "Unit economics are the foundation of every sustainable business. If the contribution margin of a single unit is negative, no amount of scale improves the situation — it worsens it. The key metric isn't growth rate; it's the ratio of lifetime value (LTV) to customer acquisition cost (CAC). A 3:1 LTV/CAC ratio is the rough threshold for a venture-scale business. Below that, you're buying revenue at a loss.",
      source: "SaaS and venture economics — Bill Gurley, David Skok, SaaS metrics research",
      tags: ["unit economics", "LTV", "CAC", "margins", "revenue", "business model", "SaaS"],
    },
    {
      id: "hana-2",
      content: "True runway accounts for the time to complete your next fundraise plus a safety buffer. The rule of thumb: close your next round at least 6 months before you'd run out. Fundraising takes 3-6 months when it goes well. If you're starting the process at 6 months of runway, you have no margin. The right time to raise is when you don't desperately need to.",
      source: "Startup finance — Y Combinator guidelines, venture finance practice",
      tags: ["runway", "fundraising", "burn rate", "cash", "finance", "startup"],
    },
    {
      id: "hana-3",
      content: "Most financial projections fail not because the math is wrong but because the assumptions are unexamined. Identify the 3-5 inputs the output is most sensitive to, then ask: how confident are you in those specifically? A sensitivity analysis isn't pessimism; it's professionalism. If doubling your customer acquisition cost blows up the model, you need to know that before committing to it.",
      source: "Financial modeling — sensitivity analysis best practices",
      tags: ["financial model", "forecast", "assumptions", "sensitivity", "risk", "finance"],
    },
    {
      id: "hana-4",
      content: "Valuation is a negotiation over assumptions, not a math problem. The DCF, comparable multiples, the venture method — these are frameworks for organizing an argument. The question isn't what method to use; it's which assumptions the buyer and seller disagree on, and which of those are testable. When a deal stalls on valuation, it's almost always because the parties have different expectations about one key variable. Name the variable.",
      source: "Corporate finance — valuation theory, M&A negotiation practice",
      tags: ["valuation", "fundraising", "investment", "deal", "DCF", "multiples"],
    },
    {
      id: "hana-5",
      content: "Risk-of-ruin is the calculation that gets skipped most often. Expected value calculations can look positive while hiding catastrophic downside. A 70% chance of a 3x return with a 30% chance of losing everything has positive expected value — but the 30% tail is an existential event. Kelly Criterion and scenario analysis exist to manage this. Never optimize only for the expected outcome without considering whether you can survive the bad scenarios.",
      source: "Risk management — Kelly Criterion, Expected Value theory, behavioral finance",
      tags: ["risk", "downside", "inversion", "bet sizing", "expected value", "survival", "kelly"],
    },
    {
      id: "hana-6",
      content: "Pricing is the highest-leverage business decision most founders get wrong. A 1% improvement in pricing flows almost entirely to the bottom line, while a 1% improvement in sales volume flows through at much lower margin. The two pricing mistakes: charging too little (founders anchor to what they would pay), and not tiering (leaving money on the table from customers with different willingness to pay). The right price is higher than you're comfortable charging.",
      source: "Pricing strategy — Price Intelligently research, SaaS pricing literature",
      tags: ["pricing", "revenue", "margins", "SaaS", "business model", "monetization"],
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // RAFA VELEZ — The Negotiator
  // ─────────────────────────────────────────────────────────────────
  "rafa-velez": [
    {
      id: "rafa-1",
      content: "The most important distinction in any negotiation is between positions and interests. A position is what someone says they want. An interest is why they want it. Positions conflict by definition; interests almost never conflict entirely. The negotiator's job is to get beneath the position to find the interest — because that's where creative solutions live. Most impasses are positional, not substantive.",
      source: "Negotiation theory — Fisher & Ury, Getting to Yes; Harvard Negotiation Project",
      tags: ["negotiation", "positions vs interests", "deal", "conflict", "BATNA", "partnership"],
    },
    {
      id: "rafa-2",
      content: "The party more willing to walk away has more power — not the party who argues better. This is why strengthening your BATNA before entering a negotiation is the highest-return preparation you can do. A founder with two term sheets has more negotiating power than a founder with one, regardless of the actual terms. Work on your alternatives before you work on your arguments.",
      source: "Negotiation strategy — BATNA concept, Fisher & Ury",
      tags: ["BATNA", "leverage", "negotiation", "alternatives", "power", "investor", "deal"],
    },
    {
      id: "rafa-3",
      content: "Deals break down not at the term sheet stage but at the drafting stage, usually over 2-3 clauses that sound procedural but carry enormous economic consequences: liquidation preferences, anti-dilution provisions, pro-rata rights. A 2× participating liquidation preference in a flat exit means founders receive nothing while investors are made whole. Read every clause for its economic consequence at exit, not just its intent.",
      source: "Venture law — term sheet economics, Brad Feld, Venture Deals",
      tags: ["term sheet", "investor", "deal", "legal", "equity", "liquidation", "fundraising"],
    },
    {
      id: "rafa-4",
      content: "Difficult conversations fail when people conflate the relationship with the problem. Be hard on the problem, soft on the relationship. This requires naming feelings without deploying them as weapons, and acknowledging the other party's perspective without conceding your position. The most reliable opener: 'I want to figure this out in a way that works for both of us. Here's my concern.'",
      source: "Difficult conversations practice — Douglas Stone, Sheila Heen, Difficult Conversations",
      tags: ["difficult conversation", "conflict", "relationship", "communication", "co-founder", "team"],
    },
    {
      id: "rafa-5",
      content: "The timing of when you reveal your priorities is as important as the priorities themselves. Revealing too much too early creates anchoring effects and cedes information advantage. Ask questions to understand their priorities first, then structure your concessions to give them things that cost you little but matter to them. Concessions that feel large to the other party but are small to you are the currency of deal-making.",
      source: "Negotiation strategy — influence and persuasion research, Robert Cialdini",
      tags: ["negotiation", "strategy", "concessions", "information", "deal", "influence"],
    },
    {
      id: "rafa-6",
      content: "Founder-investor conflicts almost always trace back to misalignment on one of four dimensions: timeline (when they expect returns), governance (how much they expect to be involved), trajectory (what success looks like), and communication (how often they expect to hear). These are negotiable before you sign and very hard to negotiate after. The most important questions to ask any potential investor before closing: 'What does a great outcome look like to you? How do you like to communicate?'",
      source: "Investor relations — venture capital dynamics, founder experience research",
      tags: ["investor", "board", "founder", "conflict", "communication", "governance", "fundraising"],
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // IMANI WRIGHT — The Coach
  // ─────────────────────────────────────────────────────────────────
  "imani-wright": [
    {
      id: "imani-1",
      content: "Procrastination is almost never about laziness. It's about fear — fear of failure, fear of judgment, fear that what you produce won't match what you imagined. The task itself isn't the problem; the emotional charge attached to it is. The most effective intervention isn't trying harder — it's naming the fear specifically and asking: what is the worst realistic outcome, and can I survive that? Most people find the answer is yes, and the procrastination loosens.",
      source: "Motivational psychology — Pychyl, Procrastination Research Group; ACT therapy",
      tags: ["procrastination", "fear", "motivation", "productivity", "blocks", "anxiety", "stuck"],
    },
    {
      id: "imani-2",
      content: "Burnout is not a productivity problem — it's a meaning problem or a boundary problem, often both. People don't burn out from working hard at things they care about with appropriate recovery. They burn out when work no longer feels meaningful, when demands consistently exceed capacity, or when they've lost all sense of agency. Addressing burnout requires identifying which driver is primary — they have different solutions.",
      source: "Occupational psychology — Christina Maslach, burnout research; self-determination theory",
      tags: ["burnout", "meaning", "purpose", "energy", "capacity", "work", "recovery", "wellbeing"],
    },
    {
      id: "imani-3",
      content: "Self-sabotage usually serves a protective function. When people consistently undermine their own success at critical moments, it's often unconscious regulation of identity threat. 'If I succeed fully, I'll have to be a different version of myself, and I'm not sure I want that.' Neither of these patterns is a character flaw. Both are mechanisms that made sense at some point and need to be named before they can be replaced.",
      source: "Psychodynamic psychology — identity threat research, schema therapy",
      tags: ["self-sabotage", "identity", "success", "fear", "psychology", "confidence", "imposter"],
    },
    {
      id: "imani-4",
      content: "The most common leadership coaching question is some version of: 'Why can't I have difficult conversations?' The answer is almost always that the person has a specific internal model of what a difficult conversation costs them — the relationship, the other person's respect, their own sense of being a good person. The reframe that works: you're not protecting the relationship by avoiding this. You're damaging it slowly.",
      source: "Leadership coaching — Kim Scott, Radical Candor; Susan Scott, Fierce Conversations",
      tags: ["difficult conversation", "leadership", "feedback", "management", "conflict", "team", "avoidance"],
    },
    {
      id: "imani-5",
      content: "Imposter syndrome is a signal, not a diagnosis. It often accompanies genuine growth — the moment when the challenge is real and the outcome matters. High achievers experience it more, not less, because they're constantly operating at the edge of their competence. The reframe: feeling uncertain doesn't mean you're unqualified. It means you're in a position where the outcome is uncertain and you care about it. That's the definition of a meaningful challenge.",
      source: "Organizational psychology — Pauline Clance, imposter syndrome research; growth mindset literature",
      tags: ["imposter syndrome", "confidence", "leadership", "growth", "fear", "competence", "identity"],
    },
    {
      id: "imani-6",
      content: "In high-stakes relationships, conflict patterns are more predictable than conflict content. The same dynamic plays out with different material: the person who avoids conflict until it explodes, the person who escalates too quickly, the person who agrees in the room and undermines outside it. Identifying the pattern is more useful than litigating any specific incident. Ask: if we've had this same conflict three times, what's the actual thing we're arguing about?",
      source: "Relationship psychology — Gottman research, systems family therapy",
      tags: ["conflict", "co-founder", "relationship", "team", "patterns", "communication", "management"],
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // EITAN BERGMANN — The Provocateur
  // ─────────────────────────────────────────────────────────────────
  "eitan-bergmann": [
    {
      id: "eitan-1",
      content: "Every problem arrives pre-framed, and the framing carries most of the answer inside it. 'How do we improve retention?' assumes retention is the right metric and that improving it is the right intervention. The first move in any serious analysis is to strip the framing and ask what the raw underlying situation actually is — before accepting the question that's been handed to you.",
      source: "Philosophy of framing — Kahneman, cognitive bias research; Wittgenstein on language games",
      tags: ["framing", "assumptions", "first principles", "reframe", "problem definition", "premise"],
    },
    {
      id: "eitan-2",
      content: "Before accepting a plan, construct the most intelligent, charitable version of the case against it. If you can't articulate the strongest form of the opposing view, you don't understand your own position well enough to defend it. The practice of steelmanning forces clarity and often reveals genuine weaknesses before they become expensive surprises.",
      source: "Philosophy of argument — Mill; steelmanning as epistemic practice",
      tags: ["devil's advocate", "steelman", "argument", "risk", "challenge", "thinking", "assumptions"],
    },
    {
      id: "eitan-3",
      content: "Conventional wisdom in any industry exists because it was once the right answer to a question that has since changed. The most valuable contrarian insight isn't 'this is wrong' — it's 'this was right under conditions that no longer exist.' When everyone agrees on something, ask: what historical condition created this consensus, and has that condition changed? This is how most breakthrough ideas enter.",
      source: "Epistemology — Kuhn, Structure of Scientific Revolutions; contrarian investing theory",
      tags: ["contrarian", "conventional wisdom", "assumptions", "innovation", "consensus", "change"],
    },
    {
      id: "eitan-4",
      content: "Inversion is the most underused thinking tool. For any plan, ask: what would guarantee failure? Not what might go wrong, but what single thing, if true, would make this definitely fail? Running the question backward often reveals risks that forward-looking analysis misses because our minds are optimized to plan, not to falsify. The Stoics called it premeditatio malorum — and it's more rigorous than most risk frameworks.",
      source: "Stoic philosophy — Marcus Aurelius, Seneca; inversion in decision-making",
      tags: ["inversion", "risk", "failure", "assumptions", "worst case", "thinking", "strategy"],
    },
    {
      id: "eitan-5",
      content: "The question 'is this decision reversible?' is one of the most important filters in any decision process. Type 1 decisions are consequential and irreversible, requiring careful process. Type 2 decisions are reversible and should be made quickly by whoever has the most context. Most organizations apply Type 1 process to Type 2 decisions, which kills speed, and occasionally Type 2 process to Type 1 decisions, which is catastrophic.",
      source: "Decision theory — Jeff Bezos 2016 shareholder letter; reversibility in decision-making",
      tags: ["decision making", "reversible", "type 1 type 2", "process", "speed", "risk"],
    },
    {
      id: "eitan-6",
      content: "Most ethical failures in organizations happen through moral disengagement — cognitive mechanisms that let people avoid applying their own ethical standards to their own behavior: displacement of responsibility ('I was just following orders'), diffusion of responsibility ('someone else will flag it'), euphemistic labeling ('restructuring' for 'firing'). You don't prevent this by being more ethical; you prevent it by making the mechanisms visible.",
      source: "Moral psychology — Albert Bandura, moral disengagement theory",
      tags: ["ethics", "decision making", "culture", "leadership", "accountability", "psychology"],
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // PRIYA ANAND — The Storyteller
  // ─────────────────────────────────────────────────────────────────
  "priya-anand": [
    {
      id: "priya-1",
      content: "Positioning is not what you say about yourself — it's what you're remembered as in contrast to alternatives. The brain categorizes by comparison: not 'what is this?' but 'what is this like and unlike?' The most powerful positioning statements aren't descriptions; they're contrasts. 'The un-cola' worked because it named a specific category and then defined the brand as its antithesis. Before writing a positioning statement, name what you are explicitly NOT.",
      source: "Brand strategy — Al Ries & Jack Trout, Positioning; category design theory",
      tags: ["positioning", "brand", "marketing", "differentiation", "messaging", "launch"],
    },
    {
      id: "priya-2",
      content: "The best pitch isn't the most comprehensive — it's the one that creates a feeling. The structure that works: (1) something is changing; (2) this creates a specific problem or opportunity; (3) we are uniquely positioned to solve it; (4) here is evidence we're already doing it. The narrative is not your business plan; it's the emotional journey that makes someone want to be part of this.",
      source: "Pitch craft — YC pitch templates, Andy Raskin's strategic narrative framework",
      tags: ["pitch", "fundraising", "narrative", "investor", "storytelling", "startup"],
    },
    {
      id: "priya-3",
      content: "Voice is to brand what tone is to music. You can play the same notes in different keys, and it changes everything. The companies with the most enduring brands have consistent voices that feel like a specific person — opinionated, distinctive, recognizable. Before defining your brand voice, ask: if this company were a person at a dinner party, what would they be like? What would they never say?",
      source: "Brand voice — Wally Olins on identity; content strategy practice",
      tags: ["brand", "voice", "content", "communication", "identity", "marketing", "product"],
    },
    {
      id: "priya-4",
      content: "Product experience communicates brand at every touchpoint. The loading screen, the error message, the onboarding email, the empty state — these aren't UX problems, they're brand problems. The companies that build the most emotionally resonant products treat every interaction as a communication. Ask of any product surface: what do we want the user to feel right now, and does this design make them feel that?",
      source: "Product design — Don Norman, Design of Everyday Things; brand experience research",
      tags: ["product", "design", "user experience", "brand", "onboarding", "UX", "communication"],
    },
    {
      id: "priya-5",
      content: "Great naming does five things at once: memorable, pronounceable, signals the category, creates an emotional impression, has a defensible trademark. Most names fail on 3 of those 5. The most common mistake is a name that describes what the product does ('FastShip') — category accurate but memorability-poor. The best product names evoke a feeling or a world, not a feature.",
      source: "Naming strategy — Marty Neumeier, The Brand Gap; naming research",
      tags: ["naming", "brand", "product", "marketing", "launch", "identity"],
    },
    {
      id: "priya-6",
      content: "The metric most companies miss in marketing is not reach or engagement — it's salience. Salience is the degree to which your brand comes to mind in the right moment, unprompted. You can have high reach and low salience (everyone has seen you, nobody thinks of you when they need you). Building salience means creating distinct, consistent associations around specific use contexts — so you own a trigger, not just an audience.",
      source: "Marketing effectiveness — Byron Sharp, How Brands Grow; brand salience research",
      tags: ["marketing", "brand", "content", "awareness", "salience", "growth", "positioning"],
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // TOMÁS RIVERA — The Steward
  // ─────────────────────────────────────────────────────────────────
  "tomas-rivera": [
    {
      id: "tomas-1",
      content: "The career decisions that compound most powerfully are the ones that open options, not close them. Early in a career, the right framework isn't 'what is the highest-value opportunity right now?' but 'what teaches me the most and leaves me the most optionality in five years?' The most valuable asset in the first decade is not salary or title — it's what you've learned to do and who has seen you do it.",
      source: "Career theory — Cal Newport, So Good They Can't Ignore You; human capital theory",
      tags: ["career", "decisions", "long term", "options", "growth", "skills", "network"],
    },
    {
      id: "tomas-2",
      content: "Throughout the late 19th and early 20th centuries, every major infrastructure transformation — railways, electricity, telephony — produced the same pattern: massive capital destruction in the infrastructure layer, enormous long-term value creation in the application layer built on top. The investors who backed the railroads mostly lost money; the companies that used railroads to build national brands made fortunes. This pattern repeats in every platform shift.",
      source: "Economic history — Carlota Perez, Technological Revolutions and Financial Capital",
      tags: ["technology", "history", "platform", "investment", "infrastructure", "long term", "pattern"],
    },
    {
      id: "tomas-3",
      content: "People regret inactions more than actions over long time horizons. In the moment, risk-aversion feels rational — the downside of a bad bet feels more vivid than the downside of the safe road not taken. Over 20 years, people consistently report regretting the chances they didn't take more than the chances they took and lost. Weight the cost of inaction more heavily than it feels in the moment.",
      source: "Psychology of regret — Daniel Kahneman, Janet Landman, regret research",
      tags: ["regret", "decision", "risk", "inaction", "career", "long term", "choice"],
    },
    {
      id: "tomas-4",
      content: "The companies and institutions with the longest lifespans share one characteristic: a clear and stable identity of what they won't do, alongside what they will. Legacy is built by subtraction as much as by addition. What you say no to, consistently, over decades, defines what you become. The 'hedgehog concept' is partially about focus, but more fundamentally about refusing to be distracted by things that are adjacent but identity-diluting.",
      source: "Organizational longevity — Jim Collins, Good to Great; corporate identity research",
      tags: ["legacy", "identity", "long term", "focus", "strategy", "leadership", "culture"],
    },
    {
      id: "tomas-5",
      content: "Trust is the most undervalued capital in any enterprise. It compounds slowly and depletes fast. An organization with high internal trust moves faster and with lower transaction costs than any competitor. Decisions are made at the right level, information flows honestly, people act without waiting for authorization. Trust is built through consistency over time and destroyed by a single prominent betrayal.",
      source: "Organizational behavior — Francis Fukuyama, Trust; psychological safety research",
      tags: ["trust", "culture", "leadership", "team", "organization", "long term", "management"],
    },
    {
      id: "tomas-6",
      content: "The difference between 5% annual growth and 7% annual growth looks trivial in year one and transformative in year twenty. This asymmetry between near-term and long-term outcomes means that short-term-optimizing decisions often produce worse long-term outcomes than alternatives — and the difference only becomes visible too late to correct. The hardest part of long-term thinking is that it feels like you're sacrificing certainty for uncertainty.",
      source: "Compounding theory — Charlie Munger on compounding; long-term investment philosophy",
      tags: ["compounding", "long term", "growth", "decisions", "investment", "patience", "wealth"],
    },
  ],
};

export function getKnowledgeForPersona(personaId: string): KnowledgeChunk[] {
  return PERSONA_KNOWLEDGE_BASE[personaId] ?? [];
}
