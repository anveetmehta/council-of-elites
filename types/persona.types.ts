export type PersonaType = 'sme' | 'archetype' | 'domain_expert';

export type PersonaArchetype =
  | 'strategist'
  | 'operator'
  | 'analyst'
  | 'coach'
  | 'provocateur'
  | 'storyteller'
  | 'steward'
  | 'negotiator'
  // legacy
  | 'leader'
  | 'philosopher'
  | 'contrarian'
  | 'builder';

export interface VoiceRules {
  sentenceStyle: string;         // e.g. "Short, declarative. One idea per sentence."
  characteristicPhrases: string[]; // 2-3 signature phrases or verbal tics
  thinkingStyle: string;          // how they process out loud
  avoids: string;                 // what they never do
}

export interface PersonaDefinition {
  id: string;
  name: string;
  tagline: string;
  archetype: PersonaArchetype;
  personaType: PersonaType;
  colorHex: string;
  description: string;
  traits: string[];
  systemPrompt: string;
  samplePrompts: string[];
  // Rich character fields
  introduction?: string;   // What they say when introducing themselves
  narrative?: string;      // Their backstory / why they think this way
  background?: string;     // One-line professional history
  knownFor?: string[];     // 2-3 things they excel at
  askAbout?: string[];     // 3-4 topics/domains they're great for
  icon?: string;           // Emoji for visual distinctiveness
  voiceRules?: VoiceRules; // How they speak — for conductor injection
  // Conductor metadata
  conductorTags?: string[]; // Keywords that trigger this persona's involvement
  // Legacy fields
  disclaimerText?: string;
  sourceAttribution?: string;
}
