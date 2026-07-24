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
    preferredFormats: QuestionCopy;
    blockchainSecurityProfile: QuestionCopy;
    securityLearningAttempt: QuestionCopy;
    studyTechniques: QuestionCopy;
    difficultAreas: QuestionCopy;
    hardestPracticeStep: QuestionCopy & { placeholder: string };
    practiceSignals: QuestionCopy;
    securityRelevance: QuestionCopy & {
      max: string;
      min: string;
    };
    betaIntent: QuestionCopy;
    contactDetails: QuestionCopy & {
      contactChannelLabel: string;
      contactLabel: string;
      contactNameLabel: string;
      contactNamePlaceholder: string;
      contactPlaceholders: {
        email: string;
        telegram: string;
      };
    };
  };
  options: {
    betaIntent: QuestionnaireOption[];
    blockchainSecurityProfile: QuestionnaireOption[];
    contactChannels: QuestionnaireOption[];
    difficultAreas: QuestionnaireOption[];
    practiceSignals: QuestionnaireOption[];
    preferredFormats: QuestionnaireOption[];
    profiles: QuestionnaireOption[];
    realExperience: QuestionnaireOption[];
    securityLearningAttempt: QuestionnaireOption[];
    studyTechniques: QuestionnaireOption[];
  };
  review: {
    contactLabel: string;
    description: string;
    labels: Record<
      | "profile"
      | "realExperience"
      | "preferredFormats"
      | "blockchainSecurityProfile"
      | "securityLearningAttempt"
      | "studyTechniques"
      | "difficultAreas"
      | "hardestPracticeStep"
      | "practiceSignals"
      | "securityRelevance"
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
  blockchainSecurityProfile: [
    "no_security_background",
    "web2_security_basics",
    "web3_security_basics",
    "solana_security_beginner",
    "ctf_or_audit_learning",
    "professional_auditor_researcher",
  ],
  studyTechniques: [
    "official_docs",
    "small_projects",
    "videos_or_workshops",
    "ai_assisted",
    "writeups_or_case_studies",
    "ctfs_or_challenges",
    "mentor_or_peer_feedback",
  ],
  difficultAreas: [
    "solana_programs_and_accounts",
    "rust_anchor_basics",
    "security_mindset",
    "real_hack_examples",
    "hands_on_practice",
    "transactions_wallets_permissions",
    "explaining_findings",
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
    "Security profile",
    "Learning strategy",
    "Security learning",
    "Study technique",
    "Difficult area",
    "Theory to practice",
    "Hands-on practice",
    "Security relevance",
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
    preferredFormats: {
      title:
        "What learning strategy would help you most with Solana security?",
      description: "Select every answer that applies.",
    },
    blockchainSecurityProfile: {
      title: "What is your current blockchain security profile?",
    },
    securityLearningAttempt: {
      title:
        "Have you ever tried to learn about security or how to audit Solana programs?",
    },
    studyTechniques: {
      title: "What study technique do you use to learn new topics?",
      description: "Select every answer that applies.",
    },
    difficultAreas: {
      title:
        "Which topic was hardest to learn, or would you like to practice first?",
      description: "Select every answer that applies.",
    },
    hardestPracticeStep: {
      title:
        "What do you consider the hardest part when moving from theory to practice?",
      description: "A short answer is enough. Aim for about 100 characters.",
      placeholder: "Share one concrete blocker.",
    },
    practiceSignals: {
      title:
        "What would make the experience feel like it is not “just theory”?",
      description: "Select every answer that applies.",
    },
    securityRelevance: {
      title:
        "How relevant do you consider Solana security learning for Web3 developers?",
      description: "Choose a score from 1 to 5.",
      min: "Not relevant",
      max: "Very relevant",
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
      contactPlaceholders: {
        email: "you@example.com",
        telegram: "@username",
      },
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
    blockchainSecurityProfile: options(
      [
        "No security background yet",
        "Basic Web2 security knowledge",
        "Basic Web3 security knowledge",
        "Beginner Solana security learner",
        "CTF or audit-report learner",
        "Professional auditor or researcher",
      ],
      optionValues.blockchainSecurityProfile
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
    studyTechniques: options(
      [
        "Read official documentation",
        "Build small projects",
        "Watch videos or workshops",
        "Use AI as a tutor",
        "Read writeups or case studies",
        "Solve CTFs or challenges",
        "Ask mentors or peers for feedback",
      ],
      optionValues.studyTechniques
    ),
    difficultAreas: options(
      [
        "Understanding Solana programs and accounts",
        "Rust or Anchor basics",
        "Thinking like an attacker",
        "Understanding real hack examples",
        "Turning examples into hands-on practice",
        "Transactions, wallets, and permissions",
        "Explaining what went wrong and why it matters",
      ],
      optionValues.difficultAreas
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
    title: "Review your contact details",
    description: "Confirm your contact details before sending them.",
    contactLabel: "Beta contact",
    contactChannelLabel: "Contact channel",
    notProvided: "Not provided",
    labels: {
      profile: "Profile",
      realExperience: "Experience",
      preferredFormats: "Learning strategy",
      blockchainSecurityProfile: "Blockchain security profile",
      securityLearningAttempt: "Security learning",
      studyTechniques: "Study technique",
      difficultAreas: "Topic to practice",
      hardestPracticeStep: "Hardest step",
      practiceSignals: "Hands-on signals",
      securityRelevance: "Security relevance",
      betaIntent: "Beta interest",
    },
  },
  validation: {
    profile: "Choose the closest profile.",
    realExperience: "Choose at least one experience.",
    preferredFormats: "Choose at least one format.",
    blockchainSecurityProfile: "Choose the closest security profile.",
    securityLearningAttempt: "Choose one answer.",
    studyTechniques: "Choose at least one study technique.",
    difficultAreas: "Choose at least one area.",
    hardestPracticeStep: "Share at least a short example.",
    practiceSignals: "Choose at least one answer.",
    securityRelevance: "Choose a score from 1 to 5.",
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
    "Perfil de seguridad",
    "Estrategia",
    "Aprendizaje de seguridad",
    "Técnica de estudio",
    "Área difícil",
    "De teoría a práctica",
    "Práctica real",
    "Relevancia",
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
    preferredFormats: {
      title:
        "¿Qué estrategia te ayudaría más a aprender sobre seguridad en Solana?",
      description: "Seleccioná todas las opciones que correspondan.",
    },
    blockchainSecurityProfile: {
      title: "¿Cuál es tu perfil actual en seguridad blockchain?",
    },
    securityLearningAttempt: {
      title:
        "¿Alguna vez intentaste aprender sobre seguridad o auditar programas en Solana?",
    },
    studyTechniques: {
      title: "¿Qué técnica de estudio utilizás para aprender temas nuevos?",
      description: "Seleccioná todas las opciones que correspondan.",
    },
    difficultAreas: {
      title: "¿Qué tema te costó más aprender o te gustaría practicar primero?",
      description: "Seleccioná todas las opciones que correspondan.",
    },
    hardestPracticeStep: {
      title:
        "¿Cuál consideras que es la parte más difícil al pasar de la teoría a práctica?",
      description:
        "Una respuesta breve alcanza. Apuntá a unos 100 caracteres.",
      placeholder: "Contanos un bloqueo concreto.",
    },
    practiceSignals: {
      title: "¿Qué haría que la experiencia no se sienta como “solo teoría”?",
      description: "Seleccioná todas las opciones que correspondan.",
    },
    securityRelevance: {
      title:
        "¿Qué tan relevante considerás aprender seguridad en Solana para desarrolladores Web3?",
      description: "Elegí un puntaje del 1 al 5.",
      min: "Poco relevante",
      max: "Muy relevante",
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
      contactPlaceholders: {
        email: "tu@email.com",
        telegram: "@usuario",
      },
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
    blockchainSecurityProfile: options(
      [
        "Sin experiencia en seguridad todavía",
        "Con bases de seguridad Web2",
        "Con bases de seguridad Web3",
        "Aprendiendo seguridad Solana",
        "Aprendiendo con CTFs o audit reports",
        "Auditor o researcher profesional",
      ],
      optionValues.blockchainSecurityProfile
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
    studyTechniques: options(
      [
        "Leer documentación oficial",
        "Construir proyectos pequeños",
        "Ver videos o workshops",
        "Usar AI como tutor",
        "Leer writeups o casos reales",
        "Resolver CTFs o challenges",
        "Pedir feedback a mentores o pares",
      ],
      optionValues.studyTechniques
    ),
    difficultAreas: options(
      [
        "Entender programas y cuentas de Solana",
        "Bases de Rust o Anchor",
        "Pensar como atacante",
        "Entender ejemplos de hacks reales",
        "Pasar ejemplos a práctica guiada",
        "Transacciones, wallets y permisos",
        "Explicar qué salió mal y por qué importa",
      ],
      optionValues.difficultAreas
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
    title: "Revisa tus datos de contacto",
    description: "Confirmá tus datos de contacto antes de enviarlos.",
    contactLabel: "Contacto para la beta",
    contactChannelLabel: "Canal de contacto",
    notProvided: "No especificado",
    labels: {
      profile: "Perfil",
      realExperience: "Experiencia",
      preferredFormats: "Estrategia de aprendizaje",
      blockchainSecurityProfile: "Perfil de seguridad blockchain",
      securityLearningAttempt: "Aprendizaje de seguridad",
      studyTechniques: "Técnica de estudio",
      difficultAreas: "Tema a practicar",
      hardestPracticeStep: "Parte más difícil",
      practiceSignals: "Señales de práctica",
      securityRelevance: "Relevancia de seguridad",
      betaIntent: "Interés en la beta",
    },
  },
  validation: {
    profile: "Elegí el perfil más cercano.",
    realExperience: "Elegí al menos una experiencia.",
    preferredFormats: "Elegí al menos un formato.",
    blockchainSecurityProfile: "Elegí el perfil de seguridad más cercano.",
    securityLearningAttempt: "Elegí una respuesta.",
    studyTechniques: "Elegí al menos una técnica de estudio.",
    difficultAreas: "Elegí al menos un área.",
    hardestPracticeStep: "Compartí al menos un ejemplo breve.",
    practiceSignals: "Elegí al menos una respuesta.",
    securityRelevance: "Elegí un puntaje del 1 al 5.",
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
