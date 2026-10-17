export const sections = [
  {
    id: "",
    label: "League HQ",
    short: "Overview",
    description: "Seven seasons. Every receipt.",
    icon: "home",
  },
  {
    id: "managers",
    label: "Manager Profiles",
    short: "Managers",
    description: "The people behind the questionable decisions.",
    icon: "users",
  },
  {
    id: "records",
    label: "Record Book",
    short: "Records",
    description: "Immortality. For better or worse.",
    icon: "trophy",
  },
  {
    id: "rivalries",
    label: "Rivalry Center",
    short: "Rivalries",
    description: "Settle it with numbers. Then argue anyway.",
    icon: "swords",
  },
  {
    id: "luck",
    label: "Luck Lab",
    short: "Luck Lab",
    description: "Good team. Bad schedule. Let’s investigate.",
    icon: "flask",
  },
  {
    id: "seasons",
    label: "Season Archives",
    short: "Seasons",
    description: "The standings don’t forget.",
    icon: "archive",
  },
  {
    id: "dna",
    label: "DraftKings DNA",
    short: "DNA",
    description: "Nine slots. Fifty grand. A personality test.",
    icon: "dna",
  },
  {
    id: "hall-of-fame",
    label: "Fame & Shame",
    short: "Fame & Shame",
    description: "A permanent home for temporary brilliance.",
    icon: "medal",
  },
] as const;
export type SectionId = (typeof sections)[number]["id"];
