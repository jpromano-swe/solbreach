import type {
  OnboardingValidationMessages,
  QuestionnaireOption,
} from "./onboarding-questionnaire-model";

export type OnboardingLocale = "en" | "es";

type QuestionCopy = {
  description?: string;
  title: string;
};

type OnboardingCopy = {
  languageLabel: string;
  briefing: {
    description: string;
    title: string;
  };
  steps: readonly string[];
  progress: {
    of: string;
    step: string;
  };
  navigation: {
    back: string;
    continue: string;
    submit: string;
    submitting: string;
  };
  submissionError: {
    fallback: string;
    title: string;
  };
  success: {
    description: string;
    documentation: string;
    eyebrow: string;
    title: string;
  };
  questions: {
    profile: QuestionCopy;
    realExperience: QuestionCopy;
    securityLearningAttempt: QuestionCopy;
    learningActions: QuestionCopy;
    learningBlockers: QuestionCopy;
    hardestPracticeStep: QuestionCopy & { placeholder: string };
    preferredFormats: QuestionCopy;
    practiceSignals: QuestionCopy;
    problemIntensity: QuestionCopy & {
      max: string;
      min: string;
      reasonLabel: string;
      reasonPlaceholder: string;
    };
    betaIntent: QuestionCopy;
    contactDetails: QuestionCopy & {
      contactChannelLabel: string;
      contactLabel: string;
      contactNameLabel: string;
      contactNamePlaceholder: string;
      contactPlaceholder: string;
    };
  };
  options: {
    betaIntent: QuestionnaireOption[];
    contactChannels: QuestionnaireOption[];
    learningActions: QuestionnaireOption[];
    learningBlockers: QuestionnaireOption[];
    practiceSignals: QuestionnaireOption[];
    preferredFormats: QuestionnaireOption[];
    profiles: QuestionnaireOption[];
    realExperience: QuestionnaireOption[];
    securityLearningAttempt: QuestionnaireOption[];
  };
  review: {
    contactLabel: string;
    description: string;
    labels: Record<
      | "profile"
      | "realExperience"
      | "securityLearningAttempt"
      | "learningActions"
      | "learningBlockers"
      | "hardestPracticeStep"
      | "preferredFormats"
      | "practiceSignals"
      | "problemIntensity"
      | "betaIntent",
      string
    >;
    contactChannelLabel: string;
    notProvided: string;
    title: string;
  };
  validation: OnboardingValidationMessages;
};

const optionValues = {
  profiles: [
    "solana_developer",
    "web3_developer_new_to_solana",
    "backend_or_rust_developer",
    "student_or_junior_builder",
    "security_researcher_or_auditor",
    "community_bootcamp_or_team",
  ],
  realExperience: [
    "not_built_anything",
    "built_simple_project",
    "worked_anchor_or_solana_programs",
    "rust_experience",
    "joined_hackathons",
    "contributed_real_projects",
  ],
  securityLearningAttempt: [
    "active",
    "lightly",
    "tried_and_stopped",
    "interested_not_started",
    "not_priority",
  ],
  learningActions: [
    "docs_or_audit_reports",
    "exploit_writeups",
    "videos_or_workshops",
    "ai_for_code_or_bugs",
    "ctfs_or_challenges",
    "reviewed_or_exploited_real_code",
    "nothing_concrete",
  ],
  learningBlockers: [
    "no_clear_path",
    "too_much_theory",
    "resources_too_advanced",
    "hard_to_identify_bugs",
    "hard_to_reproduce_exploits",
    "lacked_feedback",
    "not_stuck",
  ],
  preferredFormats: [
    "guided_modules",
    "research_labs",
    "audit_environments",
    "scored_challenges",
    "mentor_feedback",
    "final_report_or_certificate",
  ],
  practiceSignals: [
    "execute_exploit",
    "see_state_changes",
    "validation_checks",
    "real_cases",
    "feedback_or_explanation",
    "final_report",
  ],
  betaIntent: ["try_this_week", "try_later", "maybe", "not_now"],
  contactChannels: ["email", "telegram"],
} as const;

function options(
  labels: readonly string[],
  values: readonly string[]
): QuestionnaireOption[] {
  return values.map((value, index) => ({ label: labels[index], value }));
}

const english: OnboardingCopy = {
  languageLabel: "Language",
  briefing: {
    title: "How do Solana builders learn security?",
    description:
      "Tell us what you tried, where you got stuck, and whether SolBreach should invite you into the beta.",
  },
  steps: [
    "Profile",
    "Experience",
    "Security learning",
    "What you tried",
    "Blockers",
    "Theory to practice",
    "Learning format",
    "Hands-on practice",
    "Problem strength",
    "Beta interest",
    "Contact",
    "Review",
  ],
  progress: { step: "Step", of: "of" },
  navigation: {
    back: "Back",
    continue: "Continue",
    submit: "Send responses",
    submitting: "Sending...",
  },
  submissionError: {
    title: "Responses not submitted",
    fallback: "We could not submit your responses. Try again.",
  },
  success: {
    eyebrow: "Responses received",
    title: "Thank you for helping us.",
    description:
      "We’ll use these answers to improve the first beta experience and invite testers who can give real feedback.",
    documentation: "Explore the documentation",
  },
  questions: {
    profile: { title: "Which best describes your current profile?" },
    realExperience: {
      title: "What real experience do you have with Solana or Rust?",
      description: "Select every answer that applies.",
    },
    securityLearningAttempt: {
      title:
        "Have you ever tried to learn about security or how to audit Solana programs?",
    },
    learningActions: {
      title: "What have you actually done to learn about Solana security?",
      description: "Select every answer that applies.",
    },
    learningBlockers: {
      title: "Where did you feel the most difficulty?",
      description: "Select every answer that applies.",
    },
    hardestPracticeStep: {
      title: "What was the hardest part when moving from theory to practice?",
      description: "A short answer is enough. Aim for about 100 characters.",
      placeholder: "Share one concrete blocker.",
    },
    preferredFormats: {
      title:
        "What format would help you most to learn about Solana security?",
      description: "Select every answer that applies.",
    },
    practiceSignals: {
      title:
        "What would make the experience feel like it is not “just theory”?",
      description: "Select every answer that applies.",
    },
    problemIntensity: {
      title: "How strong is this problem for you today?",
      description: "Choose a score from 1 to 5.",
      min: "Not a problem right now",
      max: "An important problem",
      reasonLabel: "Why did you choose that number? (optional)",
      reasonPlaceholder: "Add a short reason",
    },
    betaIntent: {
      title:
        "Would you be available to try a first version of SolBreach focused on one specific vulnerability?",
    },
    contactDetails: {
      title: "Contact details",
      description:
        "Leave only the contact name and contact info needed for an invite.",
      contactChannelLabel: "Contact channel",
      contactNameLabel: "Contact name",
      contactNamePlaceholder: "Your name or handle",
      contactLabel: "Contact info",
      contactPlaceholder: "you@example.com or @telegram",
    },
  },
  options: {
    profiles: options(
      [
        "Solana developer",
        "Web3 developer new to Solana",
        "Backend or Rust developer",
        "Student or junior builder",
        "Security researcher or auditor",
        "Community, bootcamp, or team",
      ],
      optionValues.profiles
    ),
    realExperience: options(
      [
        "I haven’t built anything yet",
        "I built something simple",
        "I worked with Anchor or Solana programs",
        "I have Rust experience",
        "I joined hackathons",
        "I contributed to real projects",
      ],
      optionValues.realExperience
    ),
    securityLearningAttempt: options(
      [
        "Yes, actively",
        "Yes, lightly",
        "I tried and stopped",
        "Not yet, but I’m interested",
        "Not a priority right now",
      ],
      optionValues.securityLearningAttempt
    ),
    learningActions: options(
      [
        "Read docs or audit reports",
        "Read exploit writeups",
        "Watched videos or workshops",
        "Used AI to understand code or bugs",
        "Joined CTFs or challenges",
        "Tried to review or exploit real code",
        "I haven’t done anything concrete yet",
      ],
      optionValues.learningActions
    ),
    learningBlockers: options(
      [
        "I didn’t find a clear path",
        "Too much theory, not enough practice",
        "Resources were too advanced",
        "I struggled to identify real bugs",
        "I struggled to reproduce or exploit vulnerabilities",
        "I lacked feedback or guidance",
        "I didn’t get especially stuck",
      ],
      optionValues.learningBlockers
    ),
    preferredFormats: options(
      [
        "Interactive learning environments",
        "Exploratory vulnerability environments",
        "Real-audit-like environments",
        "CTFs or point-based challenges",
        "Mentor or reviewer feedback",
        "Ecosystem-validated certifications",
      ],
      optionValues.preferredFormats
    ),
    practiceSignals: options(
      [
        "Execute or simulate the exploit",
        "See real state or account changes",
        "Have validation checks",
        "Connect it to real cases",
        "Get feedback or explanation",
        "Generate a final report",
      ],
      optionValues.practiceSignals
    ),
    betaIntent: options(
      [
        "Yes, this week",
        "Yes, in the next few weeks",
        "Maybe, depending on the content",
        "Not right now",
      ],
      optionValues.betaIntent
    ),
    contactChannels: options(["Email", "Telegram"], optionValues.contactChannels),
  },
  review: {
    title: "Review your responses",
    description: "Confirm your answers before sending them.",
    contactLabel: "Beta contact",
    contactChannelLabel: "Contact channel",
    notProvided: "Not provided",
    labels: {
      profile: "Profile",
      realExperience: "Experience",
      securityLearningAttempt: "Security learning",
      learningActions: "What you tried",
      learningBlockers: "Blockers",
      hardestPracticeStep: "Hardest step",
      preferredFormats: "Learning format",
      practiceSignals: "Hands-on signals",
      problemIntensity: "Problem strength",
      betaIntent: "Beta interest",
    },
  },
  validation: {
    profile: "Choose the closest profile.",
    realExperience: "Choose at least one experience.",
    securityLearningAttempt: "Choose one answer.",
    learningActions: "Choose at least one action.",
    learningBlockers: "Choose at least one blocker.",
    hardestPracticeStep: "Share at least a short example.",
    preferredFormats: "Choose at least one format.",
    practiceSignals: "Choose at least one answer.",
    problemIntensity: "Choose a score from 1 to 5.",
    betaIntent: "Choose your current interest.",
    contactDetails: "Add contact details or choose not right now.",
    contactName: "Add a contact name.",
    preferredContactChannel: "Choose email or Telegram.",
    contact: "Add an email or Telegram username.",
  },
};

const spanish: OnboardingCopy = {
  languageLabel: "Idioma",
  briefing: {
    title: "¿Cómo aprenden seguridad los builders de Solana?",
    description:
      "Cuéntanos qué intentaste, dónde te trabaste y si te gustaría probar una primera version de SolBreach.",
  },
  steps: [
    "Perfil",
    "Experiencia",
    "Aprendizaje de seguridad",
    "Qué intentaste",
    "Bloqueos",
    "De teoría a práctica",
    "Formato de aprendizaje",
    "Práctica real",
    "Intensidad del problema",
    "Interés en la beta",
    "Contacto",
    "Revisión",
  ],
  progress: { step: "Paso", of: "de" },
  navigation: {
    back: "Atrás",
    continue: "Continuar",
    submit: "Enviar respuestas",
    submitting: "Enviando...",
  },
  submissionError: {
    title: "No se enviaron las respuestas",
    fallback: "No pudimos enviar tus respuestas. Inténtalo nuevamente.",
  },
  success: {
    eyebrow: "Respuestas recibidas",
    title: "Gracias por ayudarnos.",
    description:
      "Vamos a usar estas respuestas para ajustar la primera experiencia beta y seleccionar testers que puedan darnos feedback real.",
    documentation: "Explorar la documentación",
  },
  questions: {
    profile: { title: "¿Cuál describe mejor tu perfil actual?" },
    realExperience: {
      title: "¿Qué experiencia real tenés con Solana o Rust?",
      description: "Seleccioná todas las opciones que correspondan.",
    },
    securityLearningAttempt: {
      title:
        "¿Alguna vez intentaste aprender sobre seguridad o a auditar programas en Solana?",
    },
    learningActions: {
      title:
        "¿Qué hiciste concretamente para aprender sobre seguridad en Solana?",
      description: "Seleccioná todas las opciones que correspondan.",
    },
    learningBlockers: {
      title: "¿Dónde sientes que tuviste más dificultad?",
      description: "Seleccioná todas las opciones que correspondan.",
    },
    hardestPracticeStep: {
      title: "¿Cuál fue la parte más difícil al pasar de teoría a práctica?",
      description:
        "Una respuesta breve alcanza. Apuntá a unos 100 caracteres.",
      placeholder: "Contanos un bloqueo concreto.",
    },
    preferredFormats: {
      title:
        "¿Qué formato te ayudaría más a aprender sobre seguridad en Solana?",
      description: "Seleccioná todas las opciones que correspondan.",
    },
    practiceSignals: {
      title: "¿Qué haría que la experiencia no se sienta como “solo teoría”?",
      description: "Seleccioná todas las opciones que correspondan.",
    },
    problemIntensity: {
      title: "¿Qué tan fuerte es este problema para vos hoy?",
      description: "Elegí un puntaje del 1 al 5.",
      min: "No es un problema ahora",
      max: "Es un problema importante",
      reasonLabel: "¿Por qué elegiste ese número? (opcional)",
      reasonPlaceholder: "Agregá una razón breve",
    },
    betaIntent: {
      title:
        "¿Estarías disponible para probar una primera versión de SolBreach enfocada en una vulnerabilidad particular?",
    },
    contactDetails: {
      title: "Datos de contacto",
      description:
        "Dejá solo el nombre y el dato de contacto necesarios para enviarte la invitación.",
      contactChannelLabel: "Canal de contacto",
      contactNameLabel: "Nombre de contacto",
      contactNamePlaceholder: "Tu nombre o handle",
      contactLabel: "Dato de contacto",
      contactPlaceholder: "tu@email.com o @telegram",
    },
  },
  options: {
    profiles: options(
      [
        "Developer Solana",
        "Developer Web3 nuevo en Solana",
        "Backend o Rust developer",
        "Estudiante o junior builder",
        "Security researcher o auditor",
        "Comunidad, bootcamp o equipo",
      ],
      optionValues.profiles
    ),
    realExperience: options(
      [
        "Todavía no construí nada",
        "Construí algo simple",
        "Trabajé con Anchor o programas Solana",
        "Tengo experiencia con Rust",
        "Participé en hackathons",
        "Contribuí a proyectos reales",
      ],
      optionValues.realExperience
    ),
    securityLearningAttempt: options(
      [
        "Sí, activamente",
        "Sí, pero de forma superficial",
        "Lo intenté y lo dejé",
        "Todavía no, pero me interesa",
        "No es una prioridad ahora",
      ],
      optionValues.securityLearningAttempt
    ),
    learningActions: options(
      [
        "Leí documentación o audit reports",
        "Leí writeups de exploits",
        "Vi videos o workshops",
        "Usé AI para entender código o bugs",
        "Participé en CTFs o challenges",
        "Intenté revisar o explotar código real",
        "Todavía no hice nada concreto",
      ],
      optionValues.learningActions
    ),
    learningBlockers: options(
      [
        "No encontré un camino claro",
        "Mucha teoría, poca práctica",
        "Recursos demasiado avanzados",
        "Me costó identificar bugs reales",
        "Me costó reproducir o explotar vulnerabilidades",
        "Me faltó feedback o acompañamiento",
        "No me trabé especialmente",
      ],
      optionValues.learningBlockers
    ),
    preferredFormats: options(
      [
        "Entornos de aprendizaje interactivos",
        "Entornos de exploración de vulnerabilidades",
        "Entornos parecidos a una auditoría real",
        "CTFs o desafíos por puntaje",
        "Feedback de mentor o reviewer",
        "Certificaciones validadas por el ecosistema",
      ],
      optionValues.preferredFormats
    ),
    practiceSignals: options(
      [
        "Ejecutar o simular el exploit",
        "Ver cambios reales en estado o cuentas",
        "Tener checks de validación",
        "Conectarlo con casos reales",
        "Recibir feedback o explicación",
        "Generar un reporte final",
      ],
      optionValues.practiceSignals
    ),
    betaIntent: options(
      [
        "Sí, esta semana",
        "Sí, en las próximas semanas",
        "Tal vez, según el contenido",
        "No por ahora",
      ],
      optionValues.betaIntent
    ),
    contactChannels: options(
      ["Email", "Telegram"],
      optionValues.contactChannels
    ),
  },
  review: {
    title: "Revisá tus respuestas",
    description: "Confirmá tus respuestas antes de enviarlas.",
    contactLabel: "Contacto para la beta",
    contactChannelLabel: "Canal de contacto",
    notProvided: "No especificado",
    labels: {
      profile: "Perfil",
      realExperience: "Experiencia",
      securityLearningAttempt: "Aprendizaje de seguridad",
      learningActions: "Qué intentaste",
      learningBlockers: "Bloqueos",
      hardestPracticeStep: "Parte más difícil",
      preferredFormats: "Formato de aprendizaje",
      practiceSignals: "Señales de práctica",
      problemIntensity: "Intensidad del problema",
      betaIntent: "Interés en la beta",
    },
  },
  validation: {
    profile: "Elegí el perfil más cercano.",
    realExperience: "Elegí al menos una experiencia.",
    securityLearningAttempt: "Elegí una respuesta.",
    learningActions: "Elegí al menos una acción.",
    learningBlockers: "Elegí al menos un bloqueo.",
    hardestPracticeStep: "Compartí al menos un ejemplo breve.",
    preferredFormats: "Elegí al menos un formato.",
    practiceSignals: "Elegí al menos una respuesta.",
    problemIntensity: "Elegí un puntaje del 1 al 5.",
    betaIntent: "Elegí tu nivel de interés actual.",
    contactDetails: "Agregá datos de contacto o elegí no por ahora.",
    contactName: "Agregá un nombre de contacto.",
    preferredContactChannel: "Elegí email o Telegram.",
    contact: "Agregá un email o usuario de Telegram.",
  },
};

export const ONBOARDING_COPY: Record<OnboardingLocale, OnboardingCopy> = {
  en: english,
  es: spanish,
};

export type { OnboardingCopy };
