import type {
  OnboardingValidationMessages,
  QuestionnaireOption,
} from "./onboarding-questionnaire-model";

export type OnboardingLocale = "en" | "es";

type OnboardingCopy = {
  languageLabel: string;
  briefing: {
    description: string;
    title: string;
  };
  steps: readonly string[];
  mobileSteps: readonly string[];
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
  review: {
    companyLabel: string;
    contactLabel: string;
    description: string;
    nameLabel: string;
    notProvided: string;
    title: string;
  };
  contact: {
    contactLabel: string;
    description: string;
    nameLabel: string;
    namePlaceholder: string;
    preferredLabel: string;
    title: string;
  };
  profile: {
    description: string;
    profileLegend: string;
    securityLegend: string;
    solanaLegend: string;
    title: string;
  };
  learning: {
    description: string;
    goalsLegend: string;
    ratingLegend: string;
    ratingMax: string;
    ratingMin: string;
    sourcesLegend: string;
    title: string;
  };
  beta: {
    additionalLabel: string;
    additionalPlaceholder: string;
    description: string;
    feedbackLegend: string;
    futureLabsLabel: string;
    futureLabsPlaceholder: string;
    intentLegend: string;
    organizationLabel: string;
    organizationPlaceholder: string;
    optionalDescription: string;
    optionalTitle: string;
    title: string;
  };
  options: {
    betaIntent: QuestionnaireOption[];
    feedback: QuestionnaireOption[];
    goals: QuestionnaireOption[];
    learningSources: QuestionnaireOption[];
    profiles: QuestionnaireOption[];
    security: QuestionnaireOption[];
    solanaLevels: QuestionnaireOption[];
  };
  validation: OnboardingValidationMessages;
};

const optionValues = {
  profiles: [
    "solana_developer",
    "web3_developer_new_to_solana",
    "student_or_junior_builder",
    "security_researcher",
    "educator_bootcamp_community",
    "protocol_or_technical_team",
    "other",
  ],
  solanaLevels: [
    "learning_basics",
    "built_simple_project",
    "worked_with_anchor_or_programs",
    "advanced",
  ],
  security: [
    "almost_none",
    "read_writeups_or_audit_reports",
    "joined_ctfs",
    "reviewed_code_or_found_bugs",
    "works_or_wants_auditing",
  ],
  goals: [
    "learn_solana_security_through_practice",
    "understand_real_vulnerabilities",
    "prepare_for_cohorts_or_audits",
    "become_safer_builder_before_shipping",
    "get_visible_proof_of_skill",
    "evaluate_developers_or_students",
  ],
  learningSources: [
    "docs",
    "audit_reports",
    "x_threads",
    "youtube",
    "cohorts",
    "ctfs",
    "ai_tools",
    "mentorship",
    "no_clear_path",
  ],
  betaIntent: ["try_this_week", "try_later", "maybe", "not_now"],
  feedback: ["short_call", "form", "chat", "not_now"],
} as const;

function options(
  labels: readonly string[],
  values: readonly string[]
): QuestionnaireOption[] {
  return values.map((value, index) => ({ label: labels[index], value }));
}

const english: OnboardingCopy = {
  languageLabel: "Questionnaire language",
  briefing: {
    title: "Help us place you in the right beta group.",
    description:
      "Tell us where you are in your Solana security journey. We review each application before opening access.",
  },
  steps: ["Contact", "Profile", "Learning", "Beta fit", "Review"],
  mobileSteps: [
    "Contact",
    "Your profile",
    "Solana experience",
    "Security experience",
    "Main goals",
    "Learning sources",
    "Guided labs",
    "Beta timing",
    "Feedback",
    "Optional details",
    "Review",
  ],
  progress: { step: "Step", of: "of" },
  navigation: {
    back: "Back",
    continue: "Continue",
    submit: "Request Beta Access",
    submitting: "Submitting...",
  },
  submissionError: {
    title: "Application not submitted",
    fallback: "We could not submit your application. Try again.",
  },
  success: {
    eyebrow: "Application received",
    title: "Thanks for helping shape the beta.",
    description:
      "We will review your answers and use your preferred contact channel if a beta group matches your profile.",
    documentation: "Explore the documentation",
  },
  review: {
    title: "Review your request",
    description:
      "Confirm these details before sending your beta access request.",
    nameLabel: "Name",
    contactLabel: "Contact",
    companyLabel: "Company",
    notProvided: "Not provided",
  },
  contact: {
    title: "How should we identify and contact you?",
    description: "Use the contact channel you check most often.",
    nameLabel: "Name or handle",
    namePlaceholder: "Your name",
    preferredLabel: "Preferred contact",
    contactLabel: "Contact",
  },
  profile: {
    title: "Where are you in the Solana ecosystem?",
    description: "Choose the options that best describe your current work.",
    profileLegend: "Your profile",
    solanaLegend: "Solana experience",
    securityLegend: "Security experience",
  },
  learning: {
    title: "What do you want to improve?",
    description: "Select every answer that applies.",
    goalsLegend: "Main goals",
    sourcesLegend: "Where do you learn security today?",
    ratingLegend: "How useful would security practice labs be for you?",
    ratingMin: "Not useful",
    ratingMax: "Very useful",
  },
  beta: {
    title: "How would you participate in the beta?",
    description: "This helps us plan access groups and feedback sessions.",
    intentLegend: "When could you try SolBreach?",
    feedbackLegend: "How would you prefer to share feedback?",
    organizationLabel: "Organization or community (optional)",
    organizationPlaceholder: "Organization name",
    optionalTitle: "Anything else we should know?",
    optionalDescription:
      "These details are optional and help us review your application.",
    futureLabsLabel: "Future labs you want (optional)",
    futureLabsPlaceholder: "Signer checks, CPI, token logic...",
    additionalLabel: "Anything else? (optional)",
    additionalPlaceholder:
      "Add context that would help us review your application.",
  },
  options: {
    profiles: options(
      [
        "Solana developer",
        "Web3 developer new to Solana",
        "Student or junior builder",
        "Junior security researcher",
        "Educator or community leader",
        "Protocol or technical team",
        "Other",
      ],
      optionValues.profiles
    ),
    solanaLevels: options(
      [
        "Learning the basics",
        "Built a simple Solana project",
        "Worked with Anchor or Solana programs",
        "Advanced",
      ],
      optionValues.solanaLevels
    ),
    security: options(
      [
        "Almost none",
        "Read writeups or audit reports",
        "Joined CTFs",
        "Reviewed code or found bugs",
        "Work in or want to enter auditing",
      ],
      optionValues.security
    ),
    goals: options(
      [
        "Learn Solana security through practice",
        "Understand real vulnerability patterns",
        "Prepare for cohorts or audits",
        "Ship safer Solana programs",
        "Build visible proof of skill",
        "Evaluate developers or students",
      ],
      optionValues.goals
    ),
    learningSources: options(
      [
        "Documentation",
        "Audit reports",
        "X threads",
        "YouTube",
        "Cohorts",
        "CTFs",
        "AI tools",
        "Mentorship",
        "I do not have a clear path",
      ],
      optionValues.learningSources
    ),
    betaIntent: options(
      [
        "I can try it this week",
        "I want to try it later",
        "Maybe",
        "Not right now",
      ],
      optionValues.betaIntent
    ),
    feedback: options(
      ["Short call", "Feedback form", "Chat", "Not right now"],
      optionValues.feedback
    ),
  },
  validation: {
    name: "Enter at least two characters.",
    contact: "Add the contact where we should reach you.",
    profile: "Choose the closest profile.",
    solanaLevel: "Choose your current Solana level.",
    securityExperience: "Choose your current security experience.",
    mainGoal: "Choose at least one goal.",
    currentLearningSources: "Choose at least one learning source.",
    guidedLabUsefulness: "Choose a usefulness score.",
    betaIntent: "Tell us when you could try the beta.",
    feedbackWillingness: "Choose how you would prefer to share feedback.",
  },
};

const spanish: OnboardingCopy = {
  languageLabel: "Idioma del cuestionario",
  briefing: {
    title: "Ayúdanos a ubicarte en el grupo beta adecuado.",
    description:
      "Cuéntanos en qué etapa de tu recorrido por la seguridad en Solana estás. Revisamos cada solicitud antes de habilitar el acceso.",
  },
  steps: ["Contacto", "Perfil", "Aprendizaje", "Participación", "Revisión"],
  mobileSteps: [
    "Contacto",
    "Tu perfil",
    "Experiencia con Solana",
    "Experiencia en seguridad",
    "Objetivos principales",
    "Fuentes de aprendizaje",
    "Laboratorios guiados",
    "Disponibilidad",
    "Feedback",
    "Datos opcionales",
    "Revisión",
  ],
  progress: { step: "Paso", of: "de" },
  navigation: {
    back: "Atrás",
    continue: "Continuar",
    submit: "Solicitar acceso beta",
    submitting: "Enviando...",
  },
  submissionError: {
    title: "No se pudo enviar la solicitud",
    fallback: "No pudimos enviar tu solicitud. Inténtalo nuevamente.",
  },
  success: {
    eyebrow: "Solicitud recibida",
    title: "Gracias por ayudarnos a construir la beta.",
    description:
      "Revisaremos tus respuestas y usaremos tu canal de contacto preferido si tu perfil coincide con uno de los grupos beta.",
    documentation: "Explorar la documentación",
  },
  review: {
    title: "Revisa tu solicitud",
    description:
      "Confirma estos datos antes de enviar tu solicitud de acceso beta.",
    nameLabel: "Nombre",
    contactLabel: "Contacto",
    companyLabel: "Empresa",
    notProvided: "No especificada",
  },
  contact: {
    title: "¿Cómo debemos identificarte y contactarte?",
    description: "Usa el canal de contacto que revisas con más frecuencia.",
    nameLabel: "Nombre o alias",
    namePlaceholder: "Tu nombre",
    preferredLabel: "Contacto preferido",
    contactLabel: "Contacto",
  },
  profile: {
    title: "¿Dónde te encuentras dentro del ecosistema Solana?",
    description:
      "Elige las opciones que mejor describan tu experiencia actual.",
    profileLegend: "Tu perfil",
    solanaLegend: "Experiencia con Solana",
    securityLegend: "Experiencia en seguridad",
  },
  learning: {
    title: "¿Qué quieres mejorar?",
    description: "Selecciona todas las opciones que correspondan.",
    goalsLegend: "Objetivos principales",
    sourcesLegend: "¿Dónde aprendes seguridad actualmente?",
    ratingLegend:
      "¿Qué tan útiles serían para ti los laboratorios de práctica de seguridad?",
    ratingMin: "Nada útiles",
    ratingMax: "Muy útiles",
  },
  beta: {
    title: "¿Cómo participarías en la beta?",
    description:
      "Esto nos ayuda a planificar grupos de acceso y sesiones de feedback.",
    intentLegend: "¿Cuándo podrías probar SolBreach?",
    feedbackLegend: "¿Cómo preferirías compartir feedback?",
    organizationLabel: "Organización o comunidad (opcional)",
    organizationPlaceholder: "Nombre de la organización",
    optionalTitle: "¿Algo más que debamos saber?",
    optionalDescription:
      "Estos datos son opcionales y nos ayudan a revisar tu solicitud.",
    futureLabsLabel: "Laboratorios futuros que te interesan (opcional)",
    futureLabsPlaceholder: "Firmantes, CPI, lógica de tokens...",
    additionalLabel: "¿Algo más? (opcional)",
    additionalPlaceholder:
      "Agrega información que nos ayude a revisar tu solicitud.",
  },
  options: {
    profiles: options(
      [
        "Desarrollador de Solana",
        "Desarrollador Web3 nuevo en Solana",
        "Estudiante o builder junior",
        "Investigador junior de seguridad",
        "Educador o líder de comunidad",
        "Protocolo o equipo técnico",
        "Otro",
      ],
      optionValues.profiles
    ),
    solanaLevels: options(
      [
        "Aprendiendo los fundamentos",
        "Construí un proyecto simple en Solana",
        "Trabajé con Anchor o programas de Solana",
        "Avanzado",
      ],
      optionValues.solanaLevels
    ),
    security: options(
      [
        "Casi ninguna",
        "Leí writeups o reportes de auditoría",
        "Participé en CTFs",
        "Revisé código o encontré bugs",
        "Trabajo o quiero entrar en auditoría",
      ],
      optionValues.security
    ),
    goals: options(
      [
        "Aprender seguridad en Solana mediante la práctica",
        "Entender patrones reales de vulnerabilidades",
        "Prepararme para cohorts o auditorías",
        "Desplegar programas de Solana más seguros",
        "Construir evidencia visible de mis habilidades",
        "Evaluar desarrolladores o estudiantes",
      ],
      optionValues.goals
    ),
    learningSources: options(
      [
        "Documentación",
        "Reportes de auditoría",
        "Hilos en X",
        "YouTube",
        "Cohorts",
        "CTFs",
        "Herramientas de IA",
        "Mentoría",
        "No tengo un camino claro",
      ],
      optionValues.learningSources
    ),
    betaIntent: options(
      [
        "Puedo probarlo esta semana",
        "Quiero probarlo más adelante",
        "Tal vez",
        "Ahora no",
      ],
      optionValues.betaIntent
    ),
    feedback: options(
      ["Llamada breve", "Formulario de feedback", "Chat", "Ahora no"],
      optionValues.feedback
    ),
  },
  validation: {
    name: "Ingresa al menos dos caracteres.",
    contact: "Agrega el contacto donde podamos escribirte.",
    profile: "Elige el perfil más cercano.",
    solanaLevel: "Elige tu nivel actual en Solana.",
    securityExperience: "Elige tu experiencia actual en seguridad.",
    mainGoal: "Elige al menos un objetivo.",
    currentLearningSources: "Elige al menos una fuente de aprendizaje.",
    guidedLabUsefulness: "Elige un puntaje de utilidad.",
    betaIntent: "Indica cuándo podrías probar la beta.",
    feedbackWillingness: "Elige cómo preferirías compartir feedback.",
  },
};

export const ONBOARDING_COPY: Record<OnboardingLocale, OnboardingCopy> = {
  en: english,
  es: spanish,
};

export type { OnboardingCopy };
