import type { ForgeLanguage, ForgeMode } from "./types";

/**
 * Static challenge content and scan-site coordinates shared by the interface
 * and Three.js runtime. Data lives here so adding puzzles does not enlarge the
 * world orchestrator.
 */
export const forgeProgram = (language: ForgeLanguage, mode: ForgeMode, limit: number) => {
  const initial = mode === "product" ? 1 : 0;
  const start = mode === "product" ? 1 : 0;
  const condition = mode === "product" ? `i <= ${limit}` : `i < ${limit}`;
  const operation =
    mode === "sum"
      ? "signal += i;"
      : mode === "product"
        ? "signal *= i;"
        : "if (i % 2 == 0) signal++;";
  if (language === "Python") {
    const range = mode === "product" ? `range(1, ${limit + 1})` : `range(${limit})`;
    const pythonOperation =
      mode === "sum"
        ? "signal += i"
        : mode === "product"
          ? "signal *= i"
          : "if i % 2 == 0:\n        signal += 1";
    return `signal = ${initial}\nfor i in ${range}:\n    ${pythonOperation}\nprint(signal)`;
  }
  const declaration = language === "JavaScript" ? "let" : "int";
  const output =
    language === "C#"
      ? "Console.WriteLine(signal);"
      : language === "Java"
        ? "System.out.println(signal);"
        : "console.log(signal);";
  return `${declaration} signal = ${initial};\nfor (${declaration} i = ${start}; ${condition}; i++) {\n    ${operation}\n}\n${output}`;
};

export const forgeResult = (mode: ForgeMode, limit: number) => {
  if (mode === "sum") return (limit * (limit - 1)) / 2;
  if (mode === "evens") return Math.ceil(limit / 2);
  let result = 1;
  for (let i = 1; i <= limit; i++) result *= i;
  return result;
};

export const archivePractice = [
  {
    question: "Which Unity method is called once before the first frame update?",
    answers: ["Start()", "Update()", "OnGUI()"],
    correct: 0,
  },
  {
    question: "Which Unity component supplies gravity and physics forces to a GameObject?",
    answers: ["Rigidbody", "Transform", "Animator"],
    correct: 0,
  },
  {
    question: "Which programming structure repeats code while a condition remains true?",
    answers: ["Loop", "Class", "Property"],
    correct: 0,
  },
  {
    question: "What does a Boolean variable store?",
    answers: ["True or false", "Decimal text", "A 3D position"],
    correct: 0,
  },
  {
    question: "Which access modifier limits a C# member to its own class?",
    answers: ["public", "private", "static"],
    correct: 1,
  },
  {
    question: "Which Unity callback is best suited to physics movement?",
    answers: ["LateUpdate()", "FixedUpdate()", "Awake()"],
    correct: 1,
  },
  {
    question: "What collection stores unique values without duplicates?",
    answers: ["List", "Queue", "Set"],
    correct: 2,
  },
  {
    question: "Which operator compares two values for equality in JavaScript?",
    answers: ["=", "===", "=>"],
    correct: 1,
  },
  {
    question: "Which principle hides internal implementation behind a public interface?",
    answers: ["Inheritance", "Recursion", "Encapsulation"],
    correct: 2,
  },
];

export const landmarks = [
  {
    id: "forge",
    name: "LOOP FORGE",
    role: "Generative systems",
    color: "#4dff91",
    x: -38,
    z: -28,
  },
  {
    id: "relay",
    name: "SIGNAL RELAY",
    role: "Interactive experiences",
    color: "#38e6ff",
    x: 36,
    z: -34,
  },
  {
    id: "archive",
    name: "MEMORY ARCHIVE",
    role: "Selected work",
    color: "#c8ff55",
    x: 42,
    z: 30,
  },
  {
    id: "nexus",
    name: "POWER NEXUS",
    role: "Runtime architecture",
    color: "#c56cff",
    x: 0,
    z: 80,
  },
] as const;

export const profileSite = {
  id: "profile",
  name: "IDENTITY HOLOGRAM",
  role: "Personal profile // creative developer",
  color: "#38e6ff",
  x: 59,
  z: 2,
} as const;

export const prototypeSite = {
  id: "prototype",
  name: "PROTOTYPE ARCHIVE",
  role: "Playable build // version 0.1",
  color: "#43e5c4",
  x: -34,
  z: 72,
} as const;

export const futureSite = {
  id: "future",
  name: "FUTURE EXPANSION",
  x: 34,
  z: 72,
} as const;

export const scanSites = [...landmarks, profileSite, prototypeSite, futureSite] as const;
