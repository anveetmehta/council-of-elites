import { RecommendedCouncil } from "@/types/council.types";

export const RECOMMENDED_COUNCILS: RecommendedCouncil[] = [
  {
    id: "startup-council",
    title: "The Startup Council",
    topic: "startup",
    description:
      "A battle-tested panel for startup decisions. Paul Graham argues why your idea could work. The Sharp Contrarian tears it apart. Naval adds leverage thinking. Charlie Munger moderates with mental models.",
    members: [
      { personaId: "pg-style", role: "advocate" },
      { personaId: "sharp-contrarian", role: "critic" },
      { personaId: "naval-style", role: "default" },
      { personaId: "munger-style", role: "moderator" },
    ],
    sampleQuestion: "Should I leave my job to pursue this startup idea?",
    tags: ["startups", "entrepreneurship", "product", "career"],
  },
  {
    id: "investment-panel",
    title: "The Investment Panel",
    topic: "investing",
    description:
      "Buffett argues the fundamentals case. The Sharp Contrarian challenges the thesis. Ray Dalio adds systematic and macro thinking. Charlie Munger moderates with mental models.",
    members: [
      { personaId: "buffett-style", role: "advocate" },
      { personaId: "sharp-contrarian", role: "critic" },
      { personaId: "dalio-style", role: "default" },
      { personaId: "munger-style", role: "moderator" },
    ],
    sampleQuestion: "Is this a good long-term investment, or am I fooling myself?",
    tags: ["investing", "finance", "business", "decisions"],
  },
  {
    id: "philosophy-circle",
    title: "The Philosophy Circle",
    topic: "life",
    description:
      "For the big life questions. Aurelius and Seneca bring Stoic wisdom. The Reflective Philosopher moderates. The Empathetic Coach asks what you haven't asked yourself.",
    members: [
      { personaId: "aurelius-style", role: "default" },
      { personaId: "seneca-style", role: "default" },
      { personaId: "reflective-philosopher", role: "moderator" },
      { personaId: "empathetic-coach", role: "questioner" },
    ],
    sampleQuestion: "I'm successful by most measures but something feels hollow. What's going on?",
    tags: ["philosophy", "life", "meaning", "reflection"],
  },
  {
    id: "product-tribunal",
    title: "The Product Tribunal",
    topic: "product",
    description:
      "Steve Jobs argues for product excellence. The Sharp Contrarian finds every flaw. The Strategic Leader evaluates execution. The Creative Builder asks what you haven't imagined yet.",
    members: [
      { personaId: "jobs-style", role: "advocate" },
      { personaId: "sharp-contrarian", role: "critic" },
      { personaId: "strategic-leader", role: "default" },
      { personaId: "creative-builder", role: "questioner" },
    ],
    sampleQuestion: "Is this product actually good enough to ship, or are we rationalizing?",
    tags: ["product", "design", "startups", "execution"],
  },
  {
    id: "life-compass",
    title: "The Life Compass",
    topic: "career",
    description:
      "For career and life crossroads. The Empathetic Coach argues for your wellbeing. The Sharp Contrarian challenges your reasoning. The Reflective Philosopher moderates. The Scientific Analyst asks what the evidence says.",
    members: [
      { personaId: "empathetic-coach", role: "advocate" },
      { personaId: "sharp-contrarian", role: "critic" },
      { personaId: "reflective-philosopher", role: "moderator" },
      { personaId: "scientific-analyst", role: "questioner" },
    ],
    sampleQuestion: "Should I make this major life change, or am I running away from something?",
    tags: ["career", "life", "decisions", "self-reflection"],
  },
];

export function getRecommendedCouncilById(
  id: string
): RecommendedCouncil | undefined {
  return RECOMMENDED_COUNCILS.find((c) => c.id === id);
}

export function getRecommendedCouncilsByTopic(
  topic: string
): RecommendedCouncil[] {
  return RECOMMENDED_COUNCILS.filter((c) => c.topic === topic);
}
