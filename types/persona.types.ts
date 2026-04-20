export type PersonaType = 'archetype' | 'domain_expert';

export type PersonaArchetype =
  | 'leader'
  | 'philosopher'
  | 'analyst'
  | 'coach'
  | 'contrarian'
  | 'builder';

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
  // New fields for personalization & relatability
  introduction?: string; // What they say when introducing themselves
  narrative?: string; // Why they think this way (1-2 sentences)
  knownFor?: string[]; // 2-3 things they excel at
  askAbout?: string[]; // 3-4 topics/domains they're great for
  icon?: string; // Emoji or symbol for visual distinctiveness
  // Legacy fields
  disclaimerText?: string;
  sourceAttribution?: string;
}
