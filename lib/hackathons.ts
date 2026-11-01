// Where an idea is pitched. A preset is a hackathon *theme* with the judging people usually see at
// such events, not a specific event: we don't invent events or their rules. "My event" takes the
// real page and rules instead.
export interface HackathonPreset {
  id: string;
  label: string;
  rules: string;
}

export const PRESETS: HackathonPreset[] = [
  {
    id: "general",
    label: "Any hackathon",
    rules:
      "A typical 24 to 48 hour hackathon with teams of two to four. No specific sponsor tracks. Judging usually weighs originality, technical difficulty, impact, how complete the demo is and how well it is presented.",
  },
  {
    id: "ai",
    label: "AI & open models",
    rules:
      "An AI hackathon. AI must play an essential role, and open-source or open-weight models are a plus. Judges look for real use of the model rather than a thin wrapper, a working demo and a clear user.",
  },
  {
    id: "climate",
    label: "Climate",
    rules:
      "A climate and sustainability hackathon. Judges look for measurable environmental impact, credible data sources, feasibility and a working demo.",
  },
  {
    id: "health",
    label: "Health",
    rules:
      "A health and wellbeing hackathon. Judges look for a real patient or clinician need, care with privacy and safety, feasibility and a working demo. Medical claims need evidence.",
  },
  {
    id: "fintech",
    label: "Fintech",
    rules:
      "A fintech hackathon. Judges look for a real money problem, a business model, awareness of security and compliance, and a working demo.",
  },
  {
    id: "education",
    label: "Education",
    rules:
      "An education hackathon. Judges look for learning impact on a specific kind of learner, ease of use, feasibility and a working demo.",
  },
];

export const CUSTOM_EVENT = "custom";

export function presetById(id: string): HackathonPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
