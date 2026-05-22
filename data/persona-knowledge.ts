/**
 * Per-persona knowledge bank for Phase 3 RAG.
 *
 * Each chunk is a grounded framework, mental model, or idea — with a source
 * attribution and topic tags used for keyword-scored retrieval.
 *
 * Design rules:
 * - ~80–120 words per chunk (fits in system prompt without ballooning tokens)
 * - Real frameworks, not generic advice
 * - Written from the persona's native voice / intellectual tradition
 * - Tags mirror common question vocabulary so retrieval actually fires
 */

export interface KnowledgeChunk {
  id: string;
  content: string;
  source: string;
  tags: string[];
}

export type PersonaKnowledgeBank = Record<string, KnowledgeChunk[]>;

export const PERSONA_KNOWLEDGE_BASE: PersonaKnowledgeBank = {

  // ── ARCHETYPE PERSONAS ──────────────────────────────────────────────────────

  "strategic-leader": [
    {
      id: "sl-01",
      content: "The highest-leverage question in any organization is: what's the one thing that, if accomplished, makes everything else easier or irrelevant? Gary Keller calls this the Focusing Question. Most execution failures aren't failures of effort — they're failures of priority. When everything is important, nothing is. Force-rank ruthlessly, then protect that #1 from all encroachment.",
      source: "Gary Keller, The ONE Thing",
      tags: ["priority", "focus", "execution", "leverage", "productivity", "decision"],
    },
    {
      id: "sl-02",
      content: "Andy Grove's OKR insight: the objective is qualitative and inspiring; the key results are quantitative and falsifiable. If you can't tell, at the end of the quarter, whether you hit a key result or not — it wasn't a key result, it was an aspiration. Metrics make strategy real. Vague goals produce vague execution.",
      source: "Andy Grove, High Output Management",
      tags: ["okr", "goals", "metrics", "strategy", "measurement", "team", "planning"],
    },
    {
      id: "sl-03",
      content: "Eliyahu Goldratt's Theory of Constraints: every system has exactly one bottleneck limiting throughput at any moment. Improving anything that isn't the bottleneck is an illusion of progress. Find the constraint, exploit it fully, subordinate everything else to it, then elevate it. Then find the new constraint. This loop is strategy.",
      source: "Eliyahu Goldratt, The Goal",
      tags: ["bottleneck", "constraint", "throughput", "system", "operations", "scaling", "growth"],
    },
    {
      id: "sl-04",
      content: "Jeff Bezos's reversible vs. irreversible decision framework: Type 1 decisions are doors you can't walk back through — make them slowly and carefully. Type 2 decisions are two-way doors — make them fast and iterate. Most leaders apply Type 1 rigor to Type 2 decisions, killing speed. Misclassifying the decision type is the real mistake.",
      source: "Jeff Bezos, Amazon Shareholder Letter (2015)",
      tags: ["decision", "reversible", "speed", "risk", "founder", "leadership", "judgment"],
    },
    {
      id: "sl-05",
      content: "Pat Lencioni's five dysfunctions of a team: absence of trust → fear of conflict → lack of commitment → avoidance of accountability → inattention to results. Teams fail from the bottom up. You can't fix accountability if there's no commitment, and there's no commitment without conflict, and there's no productive conflict without trust. Address the root.",
      source: "Patrick Lencioni, The Five Dysfunctions of a Team",
      tags: ["team", "trust", "conflict", "accountability", "leadership", "culture", "performance"],
    },
    {
      id: "sl-06",
      content: "Steve Blank's customer development insight: before product-market fit, your job is not to execute a business plan — it's to search for one. The startup that runs customer discovery like a scientific experiment (hypothesis → test → iterate) reaches PMF faster than the one that ships its original vision. Get out of the building.",
      source: "Steve Blank, The Four Steps to the Epiphany",
      tags: ["product market fit", "customer", "startup", "validation", "hypothesis", "growth", "founder"],
    },
    {
      id: "sl-07",
      content: "Ben Horowitz on the 'Peacetime CEO vs. Wartime CEO': peacetime — nurture culture, build processes, delegate. Wartime — extreme focus, rapid decisions, tolerate disruption. The fatal mistake is using peacetime leadership in a wartime crisis. Know which season you're in. Urgency without clarity is noise; clarity without urgency is irrelevance.",
      source: "Ben Horowitz, The Hard Thing About Hard Things",
      tags: ["leadership", "crisis", "decision", "execution", "startup", "founder", "culture"],
    },
    {
      id: "sl-08",
      content: "Crossing the Chasm: Geoffrey Moore's insight that mainstream markets don't adopt innovation linearly. There's a structural gap between early adopters (who love novelty) and early majority (who want proven solutions). You must cross this chasm by dominating a single niche completely before expanding — not by spreading thin across all prospects.",
      source: "Geoffrey Moore, Crossing the Chasm",
      tags: ["market", "product", "growth", "customer", "strategy", "niche", "startup", "adoption"],
    },
    {
      id: "sl-09",
      content: "High Output Management's key concept: a manager's output is the output of their team plus the output they influence in adjacent teams. Your job isn't to be the best individual contributor — it's to multiply the productivity of people around you. Measure yourself by team output, not personal output.",
      source: "Andy Grove, High Output Management",
      tags: ["management", "leadership", "team", "output", "productivity", "delegate", "scaling"],
    },
    {
      id: "sl-10",
      content: "The default alive vs. default dead frame (Paul Graham): if you keep your current growth rate and current cost structure, will you be profitable before you run out of money? Most founders don't know the answer. This single question should drive every resource allocation decision in a cash-constrained environment.",
      source: "Paul Graham, Default Alive or Default Dead",
      tags: ["runway", "startup", "profitability", "growth", "funding", "resource", "financial"],
    },
  ],

  "reflective-philosopher": [
    {
      id: "rp-01",
      content: "Socrates' method wasn't just questioning — it was elenchos: systematic refutation of beliefs the person thought were settled. The goal is aporia: productive confusion that opens the door to real inquiry. When someone is certain, they've stopped thinking. The examined life requires tolerating sustained uncertainty without collapsing into an answer.",
      source: "Plato, The Apology / Meno",
      tags: ["assumption", "question", "certainty", "belief", "thinking", "inquiry", "wisdom"],
    },
    {
      id: "rp-02",
      content: "Aristotle's distinction between episteme (scientific knowledge), techne (craft), and phronesis (practical wisdom). Most education trains episteme and techne but ignores phronesis — the capacity to reason well about what to do in particular circumstances. Practical wisdom can't be reduced to rules; it's the ability to see what a situation calls for.",
      source: "Aristotle, Nicomachean Ethics",
      tags: ["wisdom", "judgment", "decision", "practical", "knowledge", "ethics", "action"],
    },
    {
      id: "rp-03",
      content: "The backward law (Alan Watts / Lao Tzu): the more you try to secure safety, the more anxious you become. The more you pursue happiness directly, the further it recedes. Presence, success, and even creativity often emerge through non-grasping. The paradox: trying hard to achieve some things prevents achieving them.",
      source: "Alan Watts, The Wisdom of Insecurity; Tao Te Ching",
      tags: ["anxiety", "happiness", "success", "effort", "paradox", "meaning", "control"],
    },
    {
      id: "rp-04",
      content: "Wittgenstein's insight: the limits of my language mean the limits of my world. When a problem feels intractable, it may be a language problem — people using the same word to mean different things, or lacking words for the actual distinction that matters. Solving the language problem often dissolves the philosophical problem.",
      source: "Ludwig Wittgenstein, Tractatus Logico-Philosophicus",
      tags: ["communication", "language", "thinking", "clarity", "conflict", "assumption", "meaning"],
    },
    {
      id: "rp-05",
      content: "Plato's allegory of the cave: those chained to appearances mistake shadows for reality. The philosopher's job is to turn toward the light — to confront the actual rather than its representation. Applied practically: most 'strategic' problems are shadow-problems. Find the thing that would actually change the outcome, not the story we tell about it.",
      source: "Plato, The Republic",
      tags: ["reality", "illusion", "assumption", "clarity", "truth", "perception", "thinking"],
    },
    {
      id: "rp-06",
      content: "Nietzsche's amor fati — love of fate. Not merely accepting what happens, but actively willing it. The question isn't 'why did this happen to me?' but 'what does this require of me?' This reframe converts passive suffering into active engagement. The obstacle doesn't diminish you — it defines you.",
      source: "Friedrich Nietzsche, Ecce Homo",
      tags: ["failure", "obstacle", "adversity", "mindset", "meaning", "resilience", "accept"],
    },
    {
      id: "rp-07",
      content: "Hegel's dialectic: thesis → antithesis → synthesis. Ideas mature through opposition. Every strong conviction contains an implicit opposite. The synthesis doesn't split the difference — it resolves the tension at a higher level. Productive disagreement is the engine of better thinking. Look for the synthesis, not the compromise.",
      source: "G.W.F. Hegel, Phenomenology of Spirit",
      tags: ["conflict", "disagreement", "tension", "thinking", "synthesis", "debate", "decision"],
    },
    {
      id: "rp-08",
      content: "The hedonic treadmill (Brickman & Campbell, 1971): humans rapidly adapt to both positive and negative changes, returning to a baseline level of happiness. The implication: pursuing achievements as the source of wellbeing is structurally flawed. The next win won't satisfy in the way you expect. The game you're playing may be the wrong game.",
      source: "Brickman & Campbell, 'Hedonic Relativism and Planning the Good Society' (1971)",
      tags: ["happiness", "success", "achievement", "satisfaction", "ambition", "meaning", "goal"],
    },
    {
      id: "rp-09",
      content: "Kant's categorical imperative: act only according to maxims you could will to be universal laws. Applied to ethics and decisions: would the world work if everyone in your situation did what you're considering? This is a different test than 'is it legal?' or 'will I get caught?' It probes the consistency of your values.",
      source: "Immanuel Kant, Groundwork of the Metaphysics of Morals",
      tags: ["ethics", "decision", "values", "principle", "moral", "consistency", "judgment"],
    },
    {
      id: "rp-10",
      content: "Simone de Beauvoir on authenticity: bad faith is pretending you have no freedom — telling yourself 'I had to' or 'I had no choice.' Every situation contains real constraints AND real freedom. The authentic life acknowledges both. Refusing the freedom is its own choice — often the coward's choice.",
      source: "Simone de Beauvoir, The Ethics of Ambiguity",
      tags: ["choice", "freedom", "accountability", "authenticity", "decision", "ownership", "change"],
    },
  ],

  "scientific-analyst": [
    {
      id: "sa-01",
      content: "Base rate neglect is the #1 forecasting error. Before analyzing the specifics of your situation, ask: what's the historical rate for similar cases? Most startups fail. Most predictions are overconfident. Most 'unique' situations are actually common patterns. Your inside view (narrative about why this is different) must be weighted against the outside view (what happened to 100 similar cases).",
      source: "Daniel Kahneman, Thinking, Fast and Slow; Philip Tetlock, Superforecasting",
      tags: ["forecast", "prediction", "probability", "base rate", "startup", "decision", "risk"],
    },
    {
      id: "sa-02",
      content: "The replication crisis: roughly 50% of published psychology findings failed to replicate in large-scale re-studies. 'Studies show' is not evidence — it's a citation. Ask: what was the sample size? Was it pre-registered? Has it been replicated? Single studies produce noise, not knowledge. Evidence is a pattern across multiple independent replications.",
      source: "Open Science Collaboration, Science (2015); Simmons et al., Psychological Science (2011)",
      tags: ["evidence", "study", "data", "research", "validation", "belief", "science"],
    },
    {
      id: "sa-03",
      content: "Fermi estimation: when exact data is unavailable, break a complex question into components you can estimate independently, then multiply. This disciplines thinking by forcing explicit assumptions. The virtue isn't precision — it's revealing which assumptions drive the answer. If your conclusion changes dramatically with small assumption changes, you don't have a strong case.",
      source: "Enrico Fermi; popularized in Peter Weinstein, Guesstimation",
      tags: ["estimation", "data", "analysis", "assumption", "financial", "market size", "planning"],
    },
    {
      id: "sa-04",
      content: "The difference between statistical significance and practical significance: a result can be highly significant (p < 0.001) with an effect size so tiny it's meaningless. Always ask for the effect size, not just the p-value. A 0.5% lift with N=10,000,000 is statistically significant but operationally irrelevant. Data without effect sizes is theater.",
      source: "Jacob Cohen, Statistical Power Analysis for the Behavioral Sciences",
      tags: ["data", "statistics", "analysis", "experiment", "growth", "metrics", "decision"],
    },
    {
      id: "sa-05",
      content: "Survivorship bias: we study successes because failures disappear. Every 'what made these companies great' analysis suffers from this — we can't interview the companies that did the same things and failed. Abraham Wald's WWII insight: the planes that didn't return taught more about where to add armor than the planes that did. Ask who's missing from the sample.",
      source: "Abraham Wald (1943); Nassim Taleb, The Black Swan",
      tags: ["survivorship", "bias", "success", "failure", "startup", "investment", "pattern"],
    },
    {
      id: "sa-06",
      content: "Bayes' theorem in practice: your confidence in a belief should be proportional to the strength of the evidence, not the strength of your desire for it to be true. When new evidence arrives, update incrementally — don't ignore it (anchoring) or over-update (overreaction). Calibrated forecasters update their beliefs in proportion to the surprise-value of new information.",
      source: "Thomas Bayes; Tetlock & Gardner, Superforecasting",
      tags: ["belief", "update", "evidence", "confidence", "forecast", "bias", "judgment"],
    },
    {
      id: "sa-07",
      content: "Goodhart's Law: when a measure becomes a target, it ceases to be a good measure. Teaching to the test. Gaming NPS scores. Optimizing engagement metrics while destroying user wellbeing. The system optimizes the metric, not the underlying thing the metric was designed to proxy. Any measurement framework will be exploited once it becomes the goal.",
      source: "Charles Goodhart (1975); Marilyn Strathern formalization",
      tags: ["metrics", "measurement", "incentive", "gaming", "culture", "performance", "growth"],
    },
    {
      id: "sa-08",
      content: "The distinction between correlation, causation, and coincidence: correlation tells you two things move together. Causation tells you one caused the other. Most 'data-driven' arguments confuse these. The definitive test is a controlled randomized experiment. Without one, you have a hypothesis, not a finding. Be precise about which you have.",
      source: "Bradford Hill Criteria (1965); standard statistical inference",
      tags: ["causation", "correlation", "data", "experiment", "analysis", "decision", "hypothesis"],
    },
    {
      id: "sa-09",
      content: "Reference class forecasting (Bent Flyvbjerg): for large, complex projects, the best predictor of cost, time, and outcome isn't the project plan — it's the average outcome of similar past projects. This outside view consistently outperforms expert inside-view forecasts. The more unique you believe your project to be, the more likely you're suffering planning fallacy.",
      source: "Bent Flyvbjerg, 'Survival of the Unfittest: Why the Worst Infrastructure Gets Built' (2009)",
      tags: ["planning", "forecast", "project", "time", "cost", "bias", "estimation"],
    },
    {
      id: "sa-10",
      content: "The falsifiability criterion (Karl Popper): a claim is scientific only if it could in principle be proven wrong. Unfalsifiable claims — those designed to be confirmed by any evidence — are not knowledge. Ask of any confident belief: what evidence would change your mind? If the answer is 'nothing,' the belief functions as an identity, not a hypothesis.",
      source: "Karl Popper, The Logic of Scientific Discovery",
      tags: ["belief", "evidence", "certainty", "thinking", "reasoning", "hypothesis", "knowledge"],
    },
  ],

  "empathetic-coach": [
    {
      id: "ec-01",
      content: "Marshall Rosenberg's Nonviolent Communication: Observe → Feel → Need → Request. The critical step is separating observations from interpretations. 'You said you'd be there and you weren't' (observation) vs. 'You don't care about this relationship' (interpretation). Most conflicts live in the gap between these two. Get to observations and needs — the request becomes obvious.",
      source: "Marshall Rosenberg, Nonviolent Communication",
      tags: ["communication", "conflict", "relationship", "emotion", "team", "feedback", "conversation"],
    },
    {
      id: "ec-02",
      content: "Amy Edmondson's psychological safety research: the highest-performing teams aren't the ones with the most talent — they're the ones where people feel safe to speak up, take risks, and admit mistakes without fear of punishment. Safety is not comfort. It's the belief that honesty won't be used against you. Without it, information doesn't flow where it's needed.",
      source: "Amy Edmondson, The Fearless Organization (Harvard Business School)",
      tags: ["team", "trust", "safety", "culture", "feedback", "leadership", "honesty"],
    },
    {
      id: "ec-03",
      content: "Carol Dweck's growth mindset research: people with fixed mindsets (intelligence is fixed) avoid challenges, give up after setbacks, and feel threatened by others' success. People with growth mindsets (abilities develop through effort) do the opposite. The most powerful lever is changing the feedback: praise effort and strategy, not talent. What you reward shapes what people become.",
      source: "Carol Dweck, Mindset: The New Psychology of Success",
      tags: ["growth", "mindset", "feedback", "learning", "failure", "talent", "resilience"],
    },
    {
      id: "ec-04",
      content: "The window of tolerance (Daniel Siegel): effective learning and change happens in a zone of moderate arousal — not in shutdown (too little activation) and not in overwhelm (too much). Coaches and leaders who push too hard produce shutdown or reactivity, not growth. Your job is to keep people in the productive zone where challenge meets capacity.",
      source: "Daniel Siegel, The Developing Mind; developed in trauma therapy",
      tags: ["emotion", "stress", "growth", "performance", "coaching", "challenge", "wellbeing"],
    },
    {
      id: "ec-05",
      content: "Brené Brown's research on vulnerability: the people who feel a strong sense of love and belonging believe they are worthy of love and belonging. This is the only difference. Vulnerability — the willingness to be seen without guarantees — is not weakness. It is the birthplace of innovation, creativity, and change. Armoring up prevents the very thing we're trying to protect.",
      source: "Brené Brown, The Gifts of Imperfection / Daring Greatly",
      tags: ["vulnerability", "trust", "relationship", "courage", "leadership", "authenticity", "shame"],
    },
    {
      id: "ec-06",
      content: "The Internal Family Systems model (Richard Schwartz): the mind contains multiple sub-personalities ('parts'), not a single unified self. Anxiety, perfectionism, inner critic — these are parts, not you. The goal isn't to eliminate parts but to understand what they're protecting and speak for them from the seat of Self (calm, curious, compassionate). Most internal conflicts are actually parts protecting each other.",
      source: "Richard Schwartz, Internal Family Systems Model",
      tags: ["anxiety", "inner critic", "emotion", "psychology", "self", "fear", "identity"],
    },
    {
      id: "ec-07",
      content: "Attachment theory (Bowlby/Ainsworth): our earliest relationship patterns become the template for adult relationships. Secure attachment → comfortable with closeness and independence. Anxious attachment → craves closeness, fears abandonment. Avoidant attachment → values independence, uncomfortable with closeness. These patterns play out in leadership, team dynamics, and relationships. Awareness is the first step to choice.",
      source: "John Bowlby, Attachment and Loss; Mary Ainsworth, Patterns of Attachment",
      tags: ["relationship", "trust", "leadership", "team", "behavior", "emotion", "pattern"],
    },
    {
      id: "ec-08",
      content: "Motivational interviewing (Miller & Rollnick): people change when they articulate their own reasons, not when someone else articulates reasons for them. The coach's job is to draw out the person's own ambivalence, amplify the discrepancy between current behavior and stated values, and roll with resistance rather than fighting it. You don't convince people to change. You help them convince themselves.",
      source: "William Miller & Stephen Rollnick, Motivational Interviewing",
      tags: ["change", "motivation", "coaching", "resistance", "behavior", "goal", "conversation"],
    },
    {
      id: "ec-09",
      content: "The self-determination theory (Deci & Ryan): intrinsic motivation requires three things — autonomy (sense of volition), competence (feeling effective), and relatedness (meaningful connection). External rewards, when overused, crowd out intrinsic motivation. The most resilient motivation is self-generated. Design environments that feed all three needs.",
      source: "Edward Deci & Richard Ryan, Self-Determination Theory",
      tags: ["motivation", "autonomy", "engagement", "performance", "team", "culture", "purpose"],
    },
    {
      id: "ec-10",
      content: "Polyvagal theory (Stephen Porges): the nervous system has three states — social engagement (safe), fight-or-flight (mobilized), and shutdown (immobilized). People can only access complex thinking and authentic connection from the social engagement state. When someone is in threat response, their prefrontal cortex is offline. Before problem-solving, restore safety. Co-regulation comes before insight.",
      source: "Stephen Porges, The Polyvagal Theory",
      tags: ["stress", "anxiety", "safety", "emotion", "coaching", "conversation", "nervous system"],
    },
  ],

  "sharp-contrarian": [
    {
      id: "sc-01",
      content: "René Girard's mimetic desire: we don't form desires independently — we want what others want, because others want it. Ambition, career choices, and social competition are largely mimetic. The uncomfortable test: would you still want this if no one could see it and no one would know? If the answer is 'probably not,' you're optimizing for status, not value.",
      source: "René Girard, Deceit, Desire, and the Novel",
      tags: ["desire", "ambition", "career", "success", "status", "motivation", "choice"],
    },
    {
      id: "sc-02",
      content: "Chesterton's Fence: never remove a fence unless you understand why it was built. Applied broadly: before eliminating a rule, process, constraint, or tradition, you must first understand the problem it solved. 'We don't know why this exists' is a reason for caution, not removal. Most second-order effects were exactly why the fence was built.",
      source: "G.K. Chesterton, The Thing (1929)",
      tags: ["decision", "change", "process", "risk", "assumption", "second order", "innovation"],
    },
    {
      id: "sc-03",
      content: "The Overton window: the range of ideas society currently considers acceptable is much narrower than the range of ideas that are actually true or useful. The best insights often start outside the window. The cost of epistemic cowardice — being vague or uncommitted to avoid controversy — is that you never identify the ideas that are actually right before they become safe to hold.",
      source: "Joseph Overton; expanded in various epistemology literature",
      tags: ["ideas", "consensus", "belief", "courage", "thinking", "contrarian", "insight"],
    },
    {
      id: "sc-04",
      content: "Second-order thinking (Howard Marks): first-order thinking asks 'what will happen?' Second-order thinking asks 'what will happen, and then what?' Most obvious actions have obvious consequences that everyone accounts for. The competitive advantage lives in seeing the second and third-order consequences that others miss. Obvious good things often have non-obvious bad second effects.",
      source: "Howard Marks, The Most Important Thing",
      tags: ["decision", "consequence", "thinking", "second order", "risk", "strategy", "prediction"],
    },
    {
      id: "sc-05",
      content: "The Iron Law of Institutions (Jonathan Schwarz): people in institutions care more about maintaining their power within the institution than about the institution's stated mission succeeding. This explains why large organizations make systematically bad decisions — the selection pressure optimizes for internal political survival, not external performance. It's not malice; it's structure.",
      source: "Jonathan Schwarz (2007); related to principal-agent problems in economics",
      tags: ["institution", "incentive", "organization", "politics", "culture", "decision", "corporate"],
    },
    {
      id: "sc-06",
      content: "The meta-contrarian trap: being contrarian just to be different is as conformist as following the crowd — you're still letting the crowd set your position, just inversely. Real independent thinking means sometimes agreeing with consensus (when it's correct) and sometimes disagreeing (when it's wrong). The goal is being right, not being different.",
      source: "Scott Alexander, Slate Star Codex; general epistemology",
      tags: ["contrarian", "thinking", "consensus", "belief", "independent", "reasoning", "judgment"],
    },
    {
      id: "sc-07",
      content: "Epistemic cowardice (Tyler Cowen): deliberately vague or uncommitted statements made to avoid controversy or conflict. The vice is common among intelligent people who know how to hedge and qualify indefinitely. The cost: you never know what you actually think, and neither does anyone else. Saying the hard, specific, potentially wrong thing is the only way to generate real information.",
      source: "Tyler Cowen; related to Galton's insight on forecasting",
      tags: ["honesty", "courage", "opinion", "clarity", "belief", "feedback", "communication"],
    },
    {
      id: "sc-08",
      content: "Nassim Taleb's via negativa: in complex systems, you gain more from removing bad things than adding good ones. Remove fragilities rather than add robustness. Remove errors rather than add sophistication. Most 'improvements' are noise — remove the noise and the signal appears. The best strategists often know more about what not to do than what to do.",
      source: "Nassim Taleb, Antifragile",
      tags: ["strategy", "decision", "simplify", "risk", "robustness", "innovation", "systems"],
    },
    {
      id: "sc-09",
      content: "The availability heuristic (Kahneman & Tversky): people judge probability by how easily examples come to mind, not by actual frequency. Vivid, recent, emotionally salient events are overweighted. Quiet, common, boring risks are underweighted. The things most likely to actually harm you are rarely the things you're afraid of. Fear is not a calibrated risk metric.",
      source: "Kahneman & Tversky, Availability: A Heuristic for Judging Frequency and Probability (1973)",
      tags: ["risk", "fear", "decision", "bias", "probability", "uncertainty", "planning"],
    },
    {
      id: "sc-10",
      content: "Status quo bias (Samuelson & Zeckhauser): people prefer the current state of affairs even when change is objectively better. The pain of loss is roughly twice the pleasure of equivalent gain (loss aversion). Most 'conservative' decisions aren't rational risk management — they're psychological protection of the existing state, even when the existing state is bad.",
      source: "Samuelson & Zeckhauser, Status Quo Bias in Decision Making (1988); Kahneman, Tversky",
      tags: ["change", "risk", "decision", "bias", "status quo", "loss aversion", "conservative"],
    },
  ],

  "creative-builder": [
    {
      id: "cb-01",
      content: "Stuart Kauffman's adjacent possible: at any moment in time, only certain innovations are actually possible — those adjacent to current reality. You can't invent the internet in 1400. The most effective builders work at the edge of the adjacent possible: one step beyond what exists, not ten steps. This is why the best ideas seem obvious in retrospect — they were.",
      source: "Stuart Kauffman, The Origins of Order; popularized by Steven Johnson",
      tags: ["innovation", "product", "idea", "timing", "creativity", "market", "technology"],
    },
    {
      id: "cb-02",
      content: "The difference between divergent and convergent thinking: divergent thinking generates many possibilities without evaluation. Convergent thinking selects and refines. Most brainstorming fails because both happen simultaneously — judgment kills ideation. Separate the phases. Generate ruthlessly, then evaluate ruthlessly. Never do both at once.",
      source: "J.P. Guilford (1967); IDEO design thinking methodology",
      tags: ["creativity", "brainstorm", "idea", "decision", "design", "product", "innovation"],
    },
    {
      id: "cb-03",
      content: "Kevin Kelly's 1000 True Fans: a creator doesn't need millions of fans to make a living — they need 1000 true fans who will buy everything you make. The math: 1000 fans × $100/year = $100,000/year. The implication: don't optimize for reach. Optimize for depth. A small audience that loves you is more valuable than a large audience that tolerates you.",
      source: "Kevin Kelly, '1,000 True Fans' (2008)",
      tags: ["audience", "product", "market", "creator", "startup", "niche", "growth"],
    },
    {
      id: "cb-04",
      content: "Paul Graham's 'Do Things That Don't Scale': in the early stages, manual things that don't scale are often exactly right. They let you learn faster, generate user insights that automation hides, and build personal relationships with early users that become the foundation of everything. The Airbnb founders photographed apartments themselves. Doing it manually is often a feature, not a bug.",
      source: "Paul Graham, 'Do Things That Don't Scale' (2013)",
      tags: ["startup", "product", "growth", "customer", "founder", "scale", "early stage"],
    },
    {
      id: "cb-05",
      content: "The 10x vs. 10% mindset: trying to improve something by 10% uses incremental thinking within the existing paradigm. Trying to improve something by 10x forces you to rethink the problem from scratch. The constraints that make 10% improvement hard often don't apply to 10x improvement. The bigger ambition often has fewer constraints than the modest one.",
      source: "Astro Teller, X (formerly Google X); Larry Page, Google",
      tags: ["innovation", "ambition", "product", "thinking", "problem", "technology", "moonshot"],
    },
    {
      id: "cb-06",
      content: "Serendipity as a system (Austin Kleon): creativity isn't inspiration striking randomly — it's the result of consistently putting yourself in the path of ideas, making connections visible, and showing work before it's finished. 'Show your work' is not just marketing advice; it's a thinking strategy. Making things public forces clarity and invites unexpected connections.",
      source: "Austin Kleon, Steal Like an Artist / Show Your Work",
      tags: ["creativity", "learning", "sharing", "network", "idea", "habit", "building"],
    },
    {
      id: "cb-07",
      content: "Jobs-to-be-done theory (Clayton Christensen): people don't buy products — they 'hire' them to do a job in their lives. The job is functional, emotional, and social. Understanding the job unlocks the real competition (which is often not who you think) and the real value proposition. Ask not 'what product do you want?' but 'what are you trying to get done?'",
      source: "Clayton Christensen, Competing Against Luck",
      tags: ["product", "customer", "market", "design", "startup", "jtbd", "value"],
    },
    {
      id: "cb-08",
      content: "The creative cycle of expansion and contraction: every creative process has a generative phase (expand possibilities, defer judgment, make connections) and a selective phase (contract, choose, execute). Professionals don't wait for inspiration — they create the conditions for generative thinking and have a process for the selective phase. Amateurs get stuck in one phase.",
      source: "Ed Catmull, Creativity Inc.; Daniel Pink, A Whole New Mind",
      tags: ["creativity", "process", "productivity", "design", "execution", "innovation", "habit"],
    },
    {
      id: "cb-09",
      content: "Taste as a competitive advantage: most people have no taste — they can't tell the difference between a good and a bad solution on first principles. Those who can see quality before the data confirms it can move faster and build better things. Taste is developed through massive input (studying what's excellent) and through making things and getting honest feedback.",
      source: "Steve Jobs, various; Ira Glass on 'The Gap'",
      tags: ["quality", "design", "product", "craft", "judgment", "taste", "excellence"],
    },
    {
      id: "cb-10",
      content: "Prototype fidelity matching phase: early prototypes should be low-fidelity (sketches, paper, clickable mockups) because high-fidelity prototypes invite feedback about surface details, not fundamental problems. High fidelity too early anchors people to the current solution rather than exploring the solution space. Use fidelity as a tool: match it to the questions you're asking.",
      source: "IDEO design thinking; Michael Schrage, Serious Play",
      tags: ["prototype", "design", "product", "feedback", "iteration", "testing", "building"],
    },
  ],

  // ── DOMAIN EXPERT PERSONAS ───────────────────────────────────────────────────

  "naval-style": [
    {
      id: "nv-01",
      content: "Specific knowledge is knowledge you cannot be trained for. It's found at the intersection of what you're deeply curious about, what you're uniquely suited to do, and what the world values. If it could be taught in a course, it's a commodity skill — it provides commodity wages. Specific knowledge is the thing you'd do even if not paid, that others find hard to learn even when motivated.",
      source: "Naval Ravikant, How to Get Rich (Naval podcast, 2018)",
      tags: ["career", "skill", "knowledge", "unique", "leverage", "wealth", "work"],
    },
    {
      id: "nv-02",
      content: "The four types of leverage: labor (others work for you), capital (money works for you), code (software works for you), media (content works for you). Labor and capital require permission. Code and media are permissionless — anyone can publish, anyone can write software. The internet has made code and media leverage available to anyone. This is why the income distribution has changed.",
      source: "Naval Ravikant, How to Get Rich (Naval podcast, 2018)",
      tags: ["leverage", "wealth", "career", "technology", "income", "scaling", "software"],
    },
    {
      id: "nv-03",
      content: "Retirement is when you stop sacrificing today for a hypothetical tomorrow. When today's work IS the reward — when you'd do it even if you didn't have to — you're retired. It has nothing to do with age or money. The goal isn't enough money to stop working; it's work that doesn't feel like work. This is achievable far sooner than conventional retirement timelines.",
      source: "Naval Ravikant, Almanack of Naval Ravikant",
      tags: ["work", "meaning", "career", "happiness", "purpose", "wealth", "lifestyle"],
    },
    {
      id: "nv-04",
      content: "Accountability paired with leverage: to get rich without being lucky, you must have accountability (operate under your own name, take reputational risk) AND leverage (code, media, capital, or labor working for you). Without accountability, you can't build leverage — no one will trust you with their capital or amplify your ideas. Accountability is the price of leverage.",
      source: "Naval Ravikant, How to Get Rich (Naval podcast, 2018)",
      tags: ["accountability", "leverage", "wealth", "founder", "risk", "reputation", "career"],
    },
    {
      id: "nv-05",
      content: "On reading: read what you love until you love to read. Don't read for completion or obligation. Read until you understand, not until you've finished. It's better to re-read the best 10 books 10 times than to read 100 mediocre books once. The compounding from deep understanding of foundational ideas outweighs the breadth of shallow exposure.",
      source: "Naval Ravikant, Almanack of Naval Ravikant",
      tags: ["learning", "reading", "knowledge", "habit", "compounding", "growth", "wisdom"],
    },
    {
      id: "nv-06",
      content: "Judgment, not hours. At high leverage, the quality of your decisions matters infinitely more than the quantity of your effort. One good investment decision beats 1,000 hours of mediocre work. One correct strategic insight beats a year of execution in the wrong direction. The goal is to be in a position where your judgment, not your time, is the limiting resource.",
      source: "Naval Ravikant, various podcasts",
      tags: ["judgment", "decision", "leverage", "work", "productivity", "thinking", "career"],
    },
    {
      id: "nv-07",
      content: "Long-term thinking is the only truly competitive advantage that compounds. Most people play short games — impress people now, optimize for the meeting, maximize the quarter. Long-term players build trust, reputation, and skills that compound over decades. Play iterated games with people who play iterated games. Reputation is the long game.",
      source: "Naval Ravikant, Almanack of Naval Ravikant",
      tags: ["long term", "compounding", "trust", "reputation", "career", "relationship", "strategy"],
    },
    {
      id: "nv-08",
      content: "Desire is a contract you make with yourself to be unhappy until you get what you want. Wanting is suffering; having, briefly, is satisfaction. The solution isn't to stop wanting — it's to be more selective about your desires. Only want things you're confident you can get, or things whose pursuit itself is the reward. The desire for status is particularly pernicious.",
      source: "Naval Ravikant, Almanack of Naval Ravikant",
      tags: ["happiness", "desire", "status", "ambition", "motivation", "meaning", "psychology"],
    },
    {
      id: "nv-09",
      content: "The most important skill of the 21st century is learning how to learn. Industries, technologies, and business models change faster than careers. The person who can pick up a new skill quickly has a perpetual advantage. Specific knowledge decays; the capacity to acquire specific knowledge compounds. Invest in learning fundamentals and meta-learning.",
      source: "Naval Ravikant, various; Scott Young, Ultralearning",
      tags: ["learning", "skill", "career", "adaptation", "growth", "knowledge", "future"],
    },
    {
      id: "nv-10",
      content: "On hiring: you want to hire people with high intelligence, high energy, and high integrity — and you need all three. Someone smart and energetic but without integrity will run circles around you using their skills against you. Intelligence without integrity is dangerous. Screen for integrity first, because it's the hardest to assess and the most important.",
      source: "Naval Ravikant, various; often attributed to Warren Buffett on integrity",
      tags: ["hiring", "team", "integrity", "trust", "leadership", "judgment", "culture"],
    },
  ],

  "pg-style": [
    {
      id: "pg-01",
      content: "The best startup ideas are ones that seem like bad ideas to most people. This is not because contrarianism is good — it's because ideas that seem obviously good get crowded fast. The valuable insight is something that's correct but non-obvious. If your idea seems plausible to everyone you tell it to, that's a warning sign, not a good sign.",
      source: "Paul Graham, 'How to Get Startup Ideas' (2012)",
      tags: ["startup", "idea", "contrarian", "founder", "market", "insight", "opportunity"],
    },
    {
      id: "pg-02",
      content: "Make something people want is not a platitude — it's a precise description of the only thing that matters. 'People want' means real people, specific people, in your life, who already have this problem and are actively looking for something. Not people you imagine exist. Not your demographic target. Actual humans who would pay you today.",
      source: "Paul Graham, Y Combinator motto",
      tags: ["product", "customer", "startup", "market fit", "validation", "founder", "build"],
    },
    {
      id: "pg-03",
      content: "Schlep blindness: people avoid startup ideas that involve unpleasant tasks — customer support, compliance, sales to unsexy businesses. But unpleasantness is a moat. The startups that win are often the ones willing to do the schlep others avoid. The harder the problem is to do, the fewer competitors you'll have. Difficulty is a feature, not a bug.",
      source: "Paul Graham, 'Schlep Blindness' (2012)",
      tags: ["startup", "idea", "moat", "competition", "founder", "opportunity", "difficulty"],
    },
    {
      id: "pg-04",
      content: "Live in the future, then build what's missing. The best way to notice a good startup idea isn't to brainstorm — it's to develop genuine expertise at the frontier of something important and notice what you reach for that doesn't exist yet. Startup ideas found by brainstorming are usually derivative. Ideas noticed by people living in the future tend to be real.",
      source: "Paul Graham, 'How to Get Startup Ideas' (2012)",
      tags: ["startup", "idea", "founder", "insight", "technology", "future", "opportunity"],
    },
    {
      id: "pg-05",
      content: "Ramen profitability isn't the goal — it's the unlock. When you can survive on minimal revenue, you gain freedom: freedom from investors, from deadlines, from desperation. You can take longer to find what actually works. The value isn't the $3,000/month; it's that you've proven something real exists and you've bought yourself time to find the real business.",
      source: "Paul Graham, 'Ramen Profitable' (2009)",
      tags: ["revenue", "startup", "profitability", "founder", "funding", "runway", "independence"],
    },
    {
      id: "pg-06",
      content: "Do things that don't scale. The impulse to automate before you understand is fatal. Do things manually until you know exactly what you're doing and why users love it. The founders who do things manually understand their users better than anyone. Automation before understanding locks in wrong assumptions at scale. Embrace the unscalable.",
      source: "Paul Graham, 'Do Things That Don't Scale' (2013)",
      tags: ["startup", "growth", "customer", "founder", "scale", "operations", "early stage"],
    },
    {
      id: "pg-07",
      content: "Writing is thinking. The essays Paul Graham writes are not marketing — they're how he thinks through ideas. Clear writing requires clear thinking. If you can't explain something simply, you don't understand it. The discipline of writing — being specific, omitting unnecessary words, structuring for a reader — is a discipline of thinking. The two are inseparable.",
      source: "Paul Graham, 'Writing, Briefly' (2005)",
      tags: ["writing", "thinking", "clarity", "communication", "essay", "leadership", "cognition"],
    },
    {
      id: "pg-08",
      content: "The prestige trap: doing things for status rather than value leads to a life optimizing the wrong metric. High-prestige careers in investment banking and consulting attract brilliant people and systematically misdirect them. The question isn't 'what's impressive?' but 'what's actually valuable?' Often these diverge. The willingness to do unsexy important work is rare and therefore valuable.",
      source: "Paul Graham, 'Disconnecting Distraction' and 'What You'll Wish You'd Known'",
      tags: ["career", "status", "prestige", "meaning", "decision", "life", "ambition"],
    },
    {
      id: "pg-09",
      content: "The idea maze: a great startup founder has thought through the space well enough to explain not just why their approach is right but why the obvious alternatives are wrong. The idea maze is what separates genuine insight from random selection. If you can't explain why competitors will fail, you don't understand your own advantage.",
      source: "Paul Graham; formalized by Balaji Srinivasan as 'idea maze'",
      tags: ["startup", "competition", "strategy", "founder", "insight", "advantage", "product"],
    },
    {
      id: "pg-10",
      content: "Determination over intelligence: the single quality Paul Graham has observed most predicting startup success is raw, unbreakable determination. Not intelligence, not technical skill, not business acumen. Startups are brutally hard; most of the work is enduring and persisting when it seems impossible. Smart people who aren't determined quit. Determined people who aren't geniuses often find a way.",
      source: "Paul Graham, 'The Anatomy of Determination' (2010)",
      tags: ["founder", "resilience", "determination", "persistence", "failure", "startup", "grit"],
    },
  ],

  "munger-style": [
    {
      id: "mu-01",
      content: "Invert, always invert (Jacobi): the most reliable way to solve a complex problem is to start by asking what would guarantee failure, then systematically avoid those things. Forward thinking generates a plan. Backward thinking reveals the traps. The stonemason's question: 'what would I have to do to guarantee this building collapses?' tells you more than 'how do I make it stand?'",
      source: "Charlie Munger, Poor Charlie's Almanack; attributed to Carl Gustav Jacob Jacobi",
      tags: ["decision", "thinking", "inversion", "failure", "strategy", "problem solving", "risk"],
    },
    {
      id: "mu-02",
      content: "The latticework of mental models: a single discipline's framework will make every problem look like that discipline's problem. An economist sees economic problems; a psychologist sees psychological ones. The person with mental models from physics, biology, psychology, statistics, and economics sees the problem more completely. Expertise depth must be balanced by model breadth.",
      source: "Charlie Munger, 'A Lesson on Elementary Worldly Wisdom' (USC Business School, 1994)",
      tags: ["mental models", "thinking", "multidisciplinary", "decision", "knowledge", "wisdom", "framework"],
    },
    {
      id: "mu-03",
      content: "Lollapalooza effects: when multiple forces act in the same direction simultaneously, the combined effect is more powerful than a simple sum. Confluence of reinforcing factors — say, social proof + scarcity + authority + commitment — produces outcomes far beyond what any single factor would predict. These convergences appear everywhere: bubbles, viral products, cults, cascade failures.",
      source: "Charlie Munger, Poor Charlie's Almanack",
      tags: ["system", "reinforcing", "compounding", "psychology", "incentive", "decision", "risk"],
    },
    {
      id: "mu-04",
      content: "Incentive-caused bias: people are systematically biased toward conclusions that serve their interests, even when they believe they're reasoning objectively. This isn't malice; it's how minds work. The prescription: identify the incentives in any situation before trusting the analysis. Ask: who benefits from this belief being true? What conclusion does their incentive structure predict?",
      source: "Charlie Munger, 'The Psychology of Human Misjudgment'",
      tags: ["incentive", "bias", "trust", "analysis", "decision", "advice", "corporate"],
    },
    {
      id: "mu-05",
      content: "Circle of competence: the expert knows both what they know and what they don't know. The edges of your circle matter more than the center. Expanding your circle slowly, through genuine learning, is valuable. Operating confidently outside your circle — which feels like expertise but isn't — is the source of most large errors. Define your circle honestly, then don't stray far from it.",
      source: "Charlie Munger / Warren Buffett, Berkshire Hathaway Annual Letters",
      tags: ["knowledge", "expertise", "decision", "judgment", "humility", "investing", "competence"],
    },
    {
      id: "mu-06",
      content: "The psychology of human misjudgment: Munger catalogued 25 cognitive biases that systematically distort human reasoning. Among the most important: social proof (I do what others do), liking/loving bias (I believe what those I admire believe), authority (I trust the credentialed), reciprocity (I return favors automatically). Knowing these is the first step to not being controlled by them.",
      source: "Charlie Munger, 'The Psychology of Human Misjudgment' (Harvard Law School, 1995)",
      tags: ["bias", "psychology", "decision", "judgment", "thinking", "persuasion", "behavior"],
    },
    {
      id: "mu-07",
      content: "Elementary worldly wisdom: most of what you need to know is elementary — not advanced. Mastering the basics of probability, accounting, microeconomics, and psychology gets you further than deep expertise in one exotic area. Munger's bet: a person who deeply understands compound interest, incentives, and social proof will outperform a narrowly trained specialist in most real-world decisions.",
      source: "Charlie Munger, 'A Lesson on Elementary Worldly Wisdom' (USC Business School, 1994)",
      tags: ["knowledge", "learning", "multidisciplinary", "wisdom", "decision", "thinking", "skill"],
    },
    {
      id: "mu-08",
      content: "Sit on your ass investing: Munger's summary of the Berkshire approach. The big money is not in the buying and the selling — it's in the waiting. Patience as an active discipline. Most investors destroy value through over-trading. Most decisions are made better by waiting. The urgency to act is usually a bias, not a signal.",
      source: "Charlie Munger, various Berkshire Hathaway Annual Meetings",
      tags: ["patience", "decision", "investing", "urgency", "discipline", "long term", "compounding"],
    },
    {
      id: "mu-09",
      content: "Opportunity cost is the invisible price of everything. Every decision to do X is a decision not to do the next-best alternative. Munger's insight: most people calculate the direct cost of decisions but ignore the opportunity cost. The most expensive decisions are often ones where the cost is invisible. Train yourself to always ask: what am I giving up by choosing this?",
      source: "Charlie Munger, various; fundamental economic concept",
      tags: ["decision", "cost", "opportunity", "trade off", "resource", "time", "priority"],
    },
    {
      id: "mu-10",
      content: "The first-class businesses test: does this business earn high returns AND have the capacity to deploy increasing amounts of capital at those same returns? Most businesses are one or the other — they're either high-return but small, or scalable but low-return. The rare exception is a business with a genuine moat AND a large addressable market. That's what compound growth actually looks like.",
      source: "Charlie Munger / Warren Buffett, Berkshire Hathaway Annual Letters",
      tags: ["business", "moat", "returns", "investment", "growth", "strategy", "compounding"],
    },
  ],

  "buffett-style": [
    {
      id: "bu-01",
      content: "The economic moat — a sustainable competitive advantage that protects a business like a moat protects a castle. Types: brand (consumers pay premium regardless of quality difference), cost (you can produce cheaper than anyone), switching costs (users can't leave without pain), network effects (more users makes the product better), regulatory (license to operate that others can't get). Without a moat, high returns attract competition until they're gone.",
      source: "Warren Buffett, Berkshire Hathaway Annual Letters",
      tags: ["moat", "competitive advantage", "business", "strategy", "investment", "growth", "barrier"],
    },
    {
      id: "bu-02",
      content: "Price is what you pay. Value is what you get. The market is a voting machine in the short run and a weighing machine in the long run. Prices reflect sentiment and narrative; value reflects fundamentals. The space between sentiment and fundamentals is where returns live. Patience between these two states — tolerating overpricing while waiting for fair pricing — is the discipline.",
      source: "Warren Buffett, various; originally attributed to Ben Graham",
      tags: ["price", "value", "market", "investment", "long term", "patience", "fundamentals"],
    },
    {
      id: "bu-03",
      content: "Temperament over intellect: investing success requires a temperament that prevents you from acting when others are in a panic and from being infected by their enthusiasm when everyone is buying. This temperament is rarer than intelligence. The market produces returns not for those who are smart but for those who can remain rational when the crowd is irrational.",
      source: "Warren Buffett, Berkshire Hathaway Annual Letters and interviews",
      tags: ["emotion", "temperament", "decision", "market", "investing", "discipline", "psychology"],
    },
    {
      id: "bu-04",
      content: "Be greedy when others are fearful, fearful when others are greedy. This is not a cute aphorism — it's a description of when to buy and when to be cautious. Market panics are the only reliable time to acquire quality assets at good prices. The person who can act when everyone else is paralyzed has a structural advantage. Requires preparation long before the panic arrives.",
      source: "Warren Buffett, Berkshire Hathaway Annual Letter (1986)",
      tags: ["contrarian", "market", "investment", "opportunity", "fear", "panic", "discipline"],
    },
    {
      id: "bu-05",
      content: "The owner-operator mindset: think of yourself as owning a piece of a real business, not trading pieces of paper. The question is not 'will this stock go up?' but 'is this a business I'd want to own for 10 years?' This time horizon change filters out noise, encourages deeper diligence, and produces patience. Most trading activity is noise; most ownership activity is signal.",
      source: "Warren Buffett, Berkshire Hathaway Annual Letters",
      tags: ["investing", "long term", "business", "ownership", "patience", "decision", "strategy"],
    },
    {
      id: "bu-06",
      content: "Compounding: the secret of Buffett's wealth is not a high annual return — it's decades of compounding. A 20% annual return over 50 years produces roughly 9,000x growth. The implication: don't interrupt compounding unnecessarily. Every time you sell a compounding asset, you reset the counter. Taxes on gains are the price of interrupting compounding. Patience is literally worth thousands of percent.",
      source: "Warren Buffett, Berkshire Hathaway Annual Letters; Alice Schroeder, The Snowball",
      tags: ["compounding", "long term", "investment", "patience", "wealth", "growth", "time"],
    },
    {
      id: "bu-07",
      content: "Management integrity: Buffett's most important quality in a management team is integrity, before intelligence or energy. His formulation: 'someone devoid of integrity, energy and intelligence is not much of a threat, but someone with the first two attributes and lacking in integrity is the most dangerous employee you can have.' Alignment of interests is the proxy check for integrity.",
      source: "Warren Buffett, Berkshire Hathaway Annual Letter (1989)",
      tags: ["management", "integrity", "trust", "hiring", "team", "leadership", "character"],
    },
    {
      id: "bu-08",
      content: "The circle of competence applied to investing: never invest in a business you can't understand. This isn't intellectual modesty — it's practical epistemology. If you can't describe how a business earns money and why it will continue to earn money in 10 years, you have no basis for valuing it. The best investors have a small circle and stay inside it rigorously.",
      source: "Warren Buffett / Charlie Munger, Berkshire Hathaway",
      tags: ["knowledge", "investing", "understanding", "competence", "decision", "humility", "risk"],
    },
    {
      id: "bu-09",
      content: "The folly of forecasting: Buffett's insight is that economic forecasts are largely noise. Nobody knows where interest rates, GDP, or markets will be in 12 months — including professional forecasters. The correct response is to build a margin of safety into your analysis so you don't need to be right about the macro to succeed. Buy businesses strong enough to survive forecast errors.",
      source: "Warren Buffett, Berkshire Hathaway Annual Letters",
      tags: ["forecast", "uncertainty", "risk", "margin of safety", "investing", "economics", "planning"],
    },
    {
      id: "bu-10",
      content: "The newspaper test: before any action, ask whether you'd be comfortable if it were reported on the front page of the newspaper tomorrow, described accurately. This test has a second form: are you doing something that, reported accurately, would make your family proud? The two tests together screen both for legal/ethical violations and for reputational risk that's legal but regrettable.",
      source: "Warren Buffett, various; Berkshire Hathaway culture",
      tags: ["ethics", "decision", "reputation", "integrity", "leadership", "judgment", "values"],
    },
  ],

  "jobs-style": [
    {
      id: "jo-01",
      content: "Focus means saying no. 'People think focus means saying yes to the thing you've got to focus on. But that's not what it means at all. It means saying no to the hundred other good ideas there are. You have to pick carefully. I'm actually as proud of the things we haven't done as the things I have done. Innovation is saying no to a thousand things.'",
      source: "Steve Jobs, Apple Worldwide Developers Conference (1997)",
      tags: ["focus", "strategy", "product", "innovation", "decision", "priority", "no"],
    },
    {
      id: "jo-02",
      content: "The intersection of technology and liberal arts: 'Technology alone is not enough. It's technology married with liberal arts, married with the humanities, that yields us the results that make our heart sing.' Jobs's belief was that the best technology is designed for humans, which requires understanding humans — not just their behavior, but their aspirations, aesthetics, and stories.",
      source: "Steve Jobs, iPad 2 event (2011)",
      tags: ["design", "technology", "humanities", "product", "creativity", "arts", "user"],
    },
    {
      id: "jo-03",
      content: "A-players demand A-players: high performers have extremely low tolerance for mediocrity in their environment. The insight is that hiring one B-player creates a permission structure for more B-players, which changes the culture from one where people learn by osmosis to one where people learn by settling. Protect the talent density ruthlessly. It's the culture itself.",
      source: "Steve Jobs, various; cited extensively in Walter Isaacson biography",
      tags: ["hiring", "talent", "team", "culture", "leadership", "quality", "excellence"],
    },
    {
      id: "jo-04",
      content: "Connecting the dots backwards: 'You can't connect the dots looking forward; you can only connect them looking backwards. So you have to trust that the dots will somehow connect in your future.' Calligraphy class at Reed College → beautiful typography in the Mac. The implication: invest in diverse experiences with no immediate payoff. The ROI is deferred and often large.",
      source: "Steve Jobs, Stanford Commencement Address (2005)",
      tags: ["career", "learning", "curiosity", "path", "trust", "creativity", "experience"],
    },
    {
      id: "jo-05",
      content: "Simplicity as hard work: 'Simple can be harder than complex. You have to work hard to get your thinking clean to make it simple. But it's worth it in the end because once you get there, you can move mountains.' Simplicity is not a design style — it is clarity of thought made visible. Every unnecessary element reflects unclear thinking about what matters.",
      source: "Steve Jobs, BusinessWeek (1998)",
      tags: ["simplicity", "design", "product", "clarity", "thinking", "craft", "quality"],
    },
    {
      id: "jo-06",
      content: "The reality distortion field: Jobs's ability to convince people — and himself — that constraints didn't apply. Not blind optimism, but a selective, willed disregard for obstacles in service of a vision. This produced genuine breakthroughs AND genuine disasters. The key question: is the constraint truly navigable, or is disregarding it just motivated reasoning? The RDF requires an honest gut check.",
      source: "Bud Tribble / Walter Isaacson, Steve Jobs biography",
      tags: ["vision", "leadership", "optimism", "constraint", "founder", "innovation", "belief"],
    },
    {
      id: "jo-07",
      content: "Users don't know what they want: 'It's really hard to design products by focus groups. A lot of times, people don't know what they want until you show it to them.' The implication: your job is not to ask users what to build but to understand their deeper needs and aspirations, then build something they didn't know they needed but immediately recognize as right.",
      source: "Steve Jobs, BusinessWeek (1998)",
      tags: ["product", "customer", "design", "user research", "innovation", "vision", "insight"],
    },
    {
      id: "jo-08",
      content: "Craftsmanship beneath the surface: Jobs's father taught him to make the back of the cabinet beautiful, even when no one would see it. This is the principle of internal integrity — doing quality work in parts that are invisible, because doing otherwise corrupts your standards everywhere. The people who know about hidden craftsmanship are you and your team. That's enough reason.",
      source: "Steve Jobs / Walter Isaacson biography; Jobs family lore",
      tags: ["quality", "craft", "integrity", "culture", "excellence", "product", "standards"],
    },
    {
      id: "jo-09",
      content: "Memento mori as clarity: 'Remembering that I'll be dead soon is the most important tool I've ever encountered to help me make the big choices in life. Almost everything — all external expectations, all pride, all fear of embarrassment or failure — these things just fall away in the face of death, leaving only what is truly important.'",
      source: "Steve Jobs, Stanford Commencement Address (2005)",
      tags: ["death", "clarity", "decision", "priority", "fear", "courage", "life"],
    },
    {
      id: "jo-10",
      content: "Eat your own dog food — use your own products. Jobs was intensely demanding of Apple products because he used them daily. The discipline of being your own most critical user generates insights no user research can replicate. The founder or product leader who doesn't use their own product will inevitably miss the experience gaps that their power-users notice immediately.",
      source: "Steve Jobs / general Silicon Valley culture; originally an internal Microsoft practice",
      tags: ["product", "quality", "user experience", "founder", "testing", "feedback", "integrity"],
    },
  ],

  "aurelius-style": [
    {
      id: "ma-01",
      content: "The dichotomy of control (Epictetus, foundational to Marcus): some things are 'up to us' — our judgments, desires, aversions, impulse toward action. Everything else — body, reputation, wealth, others' opinions — is not up to us. The fundamental Stoic practice is to locate your energy only in the former. Most suffering comes from treating the latter as if it were the former.",
      source: "Epictetus, Enchiridion; Marcus Aurelius, Meditations",
      tags: ["control", "anxiety", "stress", "worry", "decision", "mindset", "stoic"],
    },
    {
      id: "ma-02",
      content: "The obstacle is the way: 'The impediment to action advances action. What stands in the way becomes the way.' This is not reframing for comfort — it's a strategic posture. Every constraint forces creativity; every opposition reveals something. The person who treats obstacles as the actual path finds forward movement in every direction. Resistance IS the work.",
      source: "Marcus Aurelius, Meditations (Book 5, Aphorism 20); Ryan Holiday",
      tags: ["obstacle", "adversity", "resilience", "challenge", "failure", "growth", "mindset"],
    },
    {
      id: "ma-03",
      content: "The view from above: step outside your current crisis and see it from altitude. What will this look like in 5 years? In 100 years? Against the backdrop of human history? Marcus used this practice to restore proportion. Most things that feel catastrophic are small events in a large story. The practice generates equanimity, not indifference — you still act, but from calm.",
      source: "Marcus Aurelius, Meditations; Seneca, Letters",
      tags: ["perspective", "anxiety", "proportion", "stress", "decision", "calm", "clarity"],
    },
    {
      id: "ma-04",
      content: "Memento mori — remember you will die. Not as morbidity but as clarity. The awareness of mortality makes trivial things trivial and important things important. Marcus returned to this constantly: 'Confine yourself to the present.' The finitude of life is the argument for urgency about things that matter and detachment about things that don't.",
      source: "Marcus Aurelius, Meditations",
      tags: ["death", "clarity", "priority", "time", "urgency", "meaning", "life"],
    },
    {
      id: "ma-05",
      content: "Virtue as the only good (Stoic axiology): external things — wealth, health, reputation — are 'preferred indifferents.' Nice to have, not intrinsically good. Virtue (wisdom, courage, justice, temperance) is the only genuine good, because it's the only thing that's good in all circumstances. The person who confuses preferred indifferents with genuine goods builds on sand.",
      source: "Marcus Aurelius, Meditations; Epictetus, Discourses; Stoic philosophy",
      tags: ["values", "virtue", "ethics", "wealth", "success", "meaning", "character"],
    },
    {
      id: "ma-06",
      content: "The inner citadel: 'You have power over your mind, not outside events. Realize this, and you will find strength.' No external force can enter the citadel of your reasoning faculty without permission. The perception of events is what hurts or helps — not the events themselves. This is the hardest and most powerful Stoic doctrine to actually inhabit.",
      source: "Marcus Aurelius, Meditations; Pierre Hadot, The Inner Citadel",
      tags: ["resilience", "mindset", "control", "perception", "emotion", "strength", "adversity"],
    },
    {
      id: "ma-07",
      content: "Act for the common good: Marcus's philosophy was not private contemplation — it was an ethics of service. The question is not 'what's good for me?' but 'what does this role require in service of the whole?' His meditation practice was not withdrawal; it was preparation for more engaged action. Wisdom manifests as better action, not more detachment.",
      source: "Marcus Aurelius, Meditations",
      tags: ["leadership", "responsibility", "ethics", "service", "community", "purpose", "role"],
    },
    {
      id: "ma-08",
      content: "The discipline of assent: don't let first impressions dictate action. Between stimulus and response there is a space. That space contains your freedom. The practice: pause before assenting to any judgment or impulse. 'Is this impression accurate? Does it describe reality or my reaction to reality?' Almost all anxiety lives in unexamined first impressions.",
      source: "Marcus Aurelius, Meditations; Epictetus, Discourses",
      tags: ["emotion", "reaction", "pause", "anxiety", "judgment", "decision", "impulse"],
    },
    {
      id: "ma-09",
      content: "On time: 'You have power over your mind, not outside events.' And separately: 'The present moment always will have been.' Regret is pain about the past; anxiety is pain about the future. Both are suffered in the present moment where neither past nor future exists. Confine yourself to the present: it is the only place where you can act, and it is always sufficient.",
      source: "Marcus Aurelius, Meditations",
      tags: ["time", "present", "anxiety", "regret", "focus", "mindfulness", "action"],
    },
    {
      id: "ma-10",
      content: "Premeditatio malorum — pre-meditation of adversity. Before beginning anything important, deliberately imagine the ways it could go wrong. Not to generate anxiety, but to de-fang the future. If you've already sat with the possibility of failure, when difficulty arrives it doesn't destabilize you. Preparation is not pessimism — it's the foundation of genuine equanimity.",
      source: "Seneca, Letters to Lucilius; related practice in Marcus Aurelius, Meditations",
      tags: ["preparation", "failure", "adversity", "planning", "risk", "resilience", "anxiety"],
    },
  ],

  "seneca-style": [
    {
      id: "se-01",
      content: "Time is the only real wealth: 'It is not that I have so much time, it is that I am so careless with it. Time is a thing lent: it flows on. Guard it above all.' Money can be recovered; time cannot. The person who guards their time ruthlessly — from interruptions, obligations, others' agendas — is richer than the wealthy person who is perpetually busy.",
      source: "Seneca, Letters to Lucilius (Letter I)",
      tags: ["time", "priority", "productivity", "wealth", "focus", "guard", "busy"],
    },
    {
      id: "se-02",
      content: "The shortness of life is a choice: 'Life is long if you know how to use it.' Most people waste life: through entertainment, through drifting, through doing what they're supposed to do rather than what matters. The life that seems short is short because it was diluted. The discipline of choosing how to spend each day is the discipline of a long life.",
      source: "Seneca, On the Shortness of Life",
      tags: ["time", "life", "priority", "meaning", "purpose", "discipline", "focus"],
    },
    {
      id: "se-03",
      content: "The corrupting nature of luxury: beyond sufficiency, wealth becomes a burden rather than a freedom. Seneca — himself extremely wealthy — observed that those with the most things have the most anxiety about losing them. Voluntary simplicity (periodically living as if you had less) is a practice for maintaining freedom from anxiety about what you might lose.",
      source: "Seneca, Letters to Lucilius; On the Happy Life",
      tags: ["wealth", "anxiety", "simplicity", "freedom", "happiness", "lifestyle", "material"],
    },
    {
      id: "se-04",
      content: "Retire into yourself: 'Dum differtur vita transcurrit — while we are postponing, life speeds by.' The value of solitude is not absence but presence — with your own thoughts, values, and direction. Most people define themselves by what others think of them; time alone with honest reflection reveals what you actually value. Solitude is not retreat; it is the only place you meet yourself.",
      source: "Seneca, Letters to Lucilius (Letter 1)",
      tags: ["solitude", "reflection", "thinking", "clarity", "identity", "meaning", "crowd"],
    },
    {
      id: "se-05",
      content: "On anger: 'Anger is temporary madness. Even though it is sometimes justified, it is always dangerous.' The insight isn't that anger is always wrong — it's that the gap between feeling anger and expressing it productively requires a pause that very few people take. In that gap lives all of the wisdom you have. Without the pause, you're not responding; you're reacting.",
      source: "Seneca, On Anger (De Ira)",
      tags: ["anger", "emotion", "pause", "reaction", "conflict", "leadership", "temperament"],
    },
    {
      id: "se-06",
      content: "Everything is borrowed: 'Omnia aliena sunt, tempus tantum nostrum est' — all things are borrowed; time alone is ours. Your body, your possessions, your relationships — all temporary. The person who has genuinely internalized this is free from anxiety about losing any of them. Not because they don't care, but because they were never deceived about ownership in the first place.",
      source: "Seneca, Letters to Lucilius",
      tags: ["impermanence", "attachment", "anxiety", "loss", "freedom", "stoic", "mindset"],
    },
    {
      id: "se-07",
      content: "On travel as illusion: 'Travel doesn't make you better unless you bring the right self with you. If you flee from yourself on a journey, the self you fled from will be at the destination waiting.' The restlessness that drives constant travel, career change, and relationship-switching is often avoidance of the inner work. The problem you're running from is portable.",
      source: "Seneca, Letters to Lucilius (Letter 28)",
      tags: ["change", "restlessness", "growth", "psychology", "avoidance", "self", "clarity"],
    },
    {
      id: "se-08",
      content: "The philosophy of the threshold: Seneca urged reading the great minds not as authorities but as conversation partners. Pick up Epicurus and argue. Pick up Aristotle and disagree. Synthesis happens through honest collision, not reverent reception. The goal of philosophy is a mind that can reason well, not a storehouse of correct opinions.",
      source: "Seneca, Letters to Lucilius",
      tags: ["learning", "reading", "philosophy", "thinking", "wisdom", "argument", "synthesis"],
    },
    {
      id: "se-09",
      content: "On friendship: 'Before entering into friendship with someone, consider carefully whether they are worthy of trust. Once you have decided they are, trust them completely.' Seneca's model: very few deep friendships, chosen with extreme care, then given complete confidence. The contemporary pattern of many weak connections provides neither support nor challenge. Depth over breadth.",
      source: "Seneca, Letters to Lucilius (Letter 3)",
      tags: ["friendship", "trust", "relationship", "depth", "network", "loyalty", "community"],
    },
    {
      id: "se-10",
      content: "Tranquility as the goal: Seneca's highest aim is tranquillitas animi — a mind undisturbed by the swings of fortune. Not happiness (which depends on good fortune) but tranquility (which depends on wisdom). The practice: become genuinely indifferent to what you cannot control, genuinely engaged with what you can. The two together produce a life that isn't at the mercy of circumstances.",
      source: "Seneca, On Tranquility of Mind (De Tranquillitate Animi)",
      tags: ["peace", "equanimity", "resilience", "control", "wisdom", "happiness", "stoic"],
    },
  ],

  "dalio-style": [
    {
      id: "da-01",
      content: "Pain + reflection = progress. This is the fundamental equation of growth. Pain is data — it signals that something isn't working and requires understanding. The people who grow fastest aren't those who avoid pain; they're those who immediately ask 'what is this pain teaching me?' The gap between experiencing failure and extracting its lesson is where most learning is lost.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["growth", "failure", "learning", "reflection", "pain", "feedback", "mindset"],
    },
    {
      id: "da-02",
      content: "Radical transparency: make everything relevant visible to everyone involved. Not as an act of courage but as an information system. Secrecy protects weak ideas and bad decisions by preventing the feedback that would correct them. Radical transparency is uncomfortable and requires that everyone in the system can handle honest assessment. But it's the only way bad ideas die before they cause damage.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["transparency", "feedback", "culture", "communication", "organization", "trust", "honesty"],
    },
    {
      id: "da-03",
      content: "Believability-weighted decision making: not all opinions are equally valid. Weight opinions by the person's relevant track record and ability to reason through the problem. A survey of random people is not a decision-making tool. Three people with deep expertise and demonstrated judgment outweigh 30 people with strong feelings. Knowing whose views to weight — and how much — is a critical leadership skill.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["decision", "judgment", "expertise", "trust", "leadership", "advice", "team"],
    },
    {
      id: "da-04",
      content: "The two yous: higher self (wants to see clearly and improve) vs. lower self (wants to be right and protect ego). Most defensive reactions, most justifications, most refusals to update beliefs — these come from the lower self. The practice is to observe which one is speaking. Genuine intellectual engagement requires the higher self; it requires treating your beliefs as hypotheses, not as identity.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["ego", "growth", "belief", "feedback", "psychology", "identity", "learning"],
    },
    {
      id: "da-05",
      content: "Systemize your decision-making: when you solve a problem well, write it down as a principle. Over time, build a library of principles that encode your best thinking on recurring situations. This is not bureaucracy — it's compressed wisdom. The principle library reduces cognitive load, ensures consistency, and makes your reasoning available for inspection and critique.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["decision", "system", "principles", "process", "consistency", "learning", "organization"],
    },
    {
      id: "da-06",
      content: "The 5-step process for achieving goals: set goals → identify and don't tolerate problems → diagnose root causes (not symptoms) → design solutions → do what's required. Most failures occur because people jump from 'problem' directly to 'do' without diagnosing the root cause. The solution to the symptom doesn't solve the problem. Always diagnose before designing.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["process", "problem", "goal", "root cause", "solution", "diagnosis", "execution"],
    },
    {
      id: "da-07",
      content: "Radical open-mindedness: the biggest threat to good decision-making is the ego's need to be right. Open-mindedness isn't being a pushover — it's being genuinely curious about whether your view is correct, treating your own ideas as hypotheses, and being as interested in being corrected as in being confirmed. The people who update most readily in the face of good evidence are the best thinkers.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["openness", "ego", "learning", "feedback", "belief", "update", "growth"],
    },
    {
      id: "da-08",
      content: "The machine metaphor: see your team, organization, or process as a machine you're designing and improving. Your job as the operator is to set goals and design the machine. Your job as a designer is to look at the machine's outputs and improve it. The mistake is being so embedded in operating that you never step back to redesign. Pull up to machine level regularly.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["organization", "systems", "leadership", "process", "improvement", "design", "team"],
    },
    {
      id: "da-09",
      content: "Triangulate with disagreers: when making an important decision, find people you respect who disagree with you. Not to validate your position — to stress-test it. The best Bridgewater decisions came from structured disagreement between smart people with different views. Consensus among people who already agree tells you nothing. Stress-test through genuine dissent.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["decision", "feedback", "disagreement", "devil's advocate", "team", "judgment", "debate"],
    },
    {
      id: "da-10",
      content: "Archetypes and pattern recognition: over time, every person, situation, and problem type is an instance of a recognizable archetype. Once you've seen a problem type enough times, you can apply the principle that solved it before rather than reinventing from scratch. Building a personal database of archetypes — through systematic reflection on experience — is how wisdom becomes transferable.",
      source: "Ray Dalio, Principles: Life and Work",
      tags: ["pattern", "learning", "experience", "wisdom", "principle", "judgment", "decision"],
    },
  ],
};
