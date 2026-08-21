import type { VisaCategory } from "@/generated/prisma/client";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** The subset of wizard answers that checklist rules depend on. */
export type ChecklistAnswers = {
  instructionLanguage?: "de" | "en";
  medicalProfession?: "doctor" | "dentist" | "pharmacist" | "nurse" | "other";
};

export type Requirement = {
  /**
   * Stable identifier, stored on Document.requirementCode.
   * NEVER change a code once it is live — it would orphan every file
   * already uploaded against it.
   */
  code: string;
  labelEn: string;
  labelAr: string;
  /** Does a missing upload block submission? */
  required: boolean;
  /** Omitted = always shown. Returns false = hidden entirely for this applicant. */
  appliesTo?: (answers: ChecklistAnswers) => boolean;
};

/* -------------------------------------------------------------------------- */
/*  Documents — defined once, reused across categories                        */
/* -------------------------------------------------------------------------- */

const PASSPORT: Requirement = {
  code: "PASSPORT",
  labelEn: "Valid passport",
  labelAr: "جواز سفر ساري المفعول",
  required: true,
};

const BIOMETRIC_PHOTO: Requirement = {
  code: "BIOMETRIC_PHOTO",
  labelEn: "Recent biometric photos",
  labelAr: "صور شخصية بيومترية حديثة",
  required: true,
};

const GRADUATION_CERTIFICATE: Requirement = {
  code: "GRADUATION_CERTIFICATE",
  labelEn: "Graduation certificate",
  labelAr: "مصدقة التخرج",
  required: true,
};

const TRANSCRIPT: Requirement = {
  code: "TRANSCRIPT",
  labelEn: "Transcript of records",
  labelAr: "كشف العلامات",
  required: true,
};

const GERMAN_B1: Requirement = {
  code: "GERMAN_B1",
  labelEn: "German language certificate, level B1",
  labelAr: "شهادة إجادة اللغة الألمانية مستوى B1",
  required: true,
};

const ENGLISH_CERTIFICATE: Requirement = {
  code: "ENGLISH_CERTIFICATE",
  labelEn: "English language certificate",
  labelAr: "شهادة إجادة اللغة الإنجليزية",
  required: true,
  appliesTo: (a) => a.instructionLanguage === "en",
};

/* --- Medical D16 only ----------------------------------------------------- */

const UNIVERSITY_DEGREE: Requirement = {
  code: "UNIVERSITY_DEGREE",
  labelEn: "University degree",
  labelAr: "الشهادة الجامعية",
  required: true,
};

const HOURS_STATEMENT: Requirement = {
  code: "HOURS_STATEMENT",
  labelEn: "Statement of practical and theoretical hours",
  labelAr: "بيان بعدد الساعات العملية والنظرية",
  required: true,
};

const REPEAT_STATEMENT: Requirement = {
  code: "REPEAT_STATEMENT",
  labelEn: "Repeat statement (doctors)",
  labelAr: "بيان معاودة للأطباء",
  required: false,
  appliesTo: (a) => a.medicalProfession === "doctor",
};

const CRIMINAL_RECORD: Requirement = {
  code: "CRIMINAL_RECORD",
  labelEn: "Criminal record extract",
  labelAr: "خلاصة سجل عدلي",
  required: true,
};

const BIRTH_CERTIFICATE: Requirement = {
  code: "BIRTH_CERTIFICATE",
  labelEn: "Birth certificate",
  labelAr: "بيان ولادة",
  required: true,
};

const CIVIL_REGISTRY_EXTRACT: Requirement = {
  code: "CIVIL_REGISTRY_EXTRACT",
  labelEn: "Civil registry extract",
  labelAr: "إخراج قيد",
  required: true,
};

const GOOD_CONDUCT: Requirement = {
  code: "GOOD_CONDUCT",
  labelEn: "Good conduct certificate (Ministry of Health or Syndicate)",
  labelAr: "حسن سيرة وسلوك من وزارة الصحة أو النقابة",
  required: true,
};

const PROFESSIONAL_LICENSE: Requirement = {
  code: "PROFESSIONAL_LICENSE",
  labelEn: "Professional practice licence",
  labelAr: "ترخيص مزاولة المهنة",
  required: true,
};

const MEDICAL_REPORT: Requirement = {
  code: "MEDICAL_REPORT",
  labelEn: "Medical report",
  labelAr: "تقرير طبي",
  required: true,
};

/* --- Ausbildung only ------------------------------------------------------ */

const AUSBILDUNG_CONTRACT: Requirement = {
  code: "AUSBILDUNG_CONTRACT",
  labelEn: "Ausbildung contract",
  labelAr: "عقد الأوسبيلدونغ",
  required: true,
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Returns a COPY with `required` flipped to false.
 * The spread is essential: every category references the same requirement
 * objects, so mutating one would change it everywhere.
 */
function optional(req: Requirement): Requirement {
  return { ...req, required: false };
}

/* -------------------------------------------------------------------------- */
/*  Checklists per category                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `Record<VisaCategory, …>` makes TypeScript refuse to compile if a category
 * is missing. Add a fifth visa type to the Prisma enum and this file errors
 * until it is handled here.
 *
 * Order matters — it is the order applicants see.
 */
export const CHECKLISTS: Record<VisaCategory, Requirement[]> = {
  JOB_SEEKER: [
    PASSPORT,
    BIOMETRIC_PHOTO,
    GRADUATION_CERTIFICATE,
    TRANSCRIPT,
    GERMAN_B1,
  ],

  STUDENT: [
    PASSPORT,
    BIOMETRIC_PHOTO,
    GRADUATION_CERTIFICATE,
    TRANSCRIPT,
    GERMAN_B1,
    ENGLISH_CERTIFICATE,
  ],

  MEDICAL: [
    PASSPORT,
    BIOMETRIC_PHOTO,
    GRADUATION_CERTIFICATE,
    TRANSCRIPT,
    UNIVERSITY_DEGREE,
    GERMAN_B1,
    HOURS_STATEMENT,
    REPEAT_STATEMENT,
    CRIMINAL_RECORD,
    BIRTH_CERTIFICATE,
    CIVIL_REGISTRY_EXTRACT,
    GOOD_CONDUCT,
    PROFESSIONAL_LICENSE,
    MEDICAL_REPORT,
  ],

  AUSBILDUNG: [
    PASSPORT,
    BIOMETRIC_PHOTO,
    optional(GRADUATION_CERTIFICATE), // اختياري — a dual Ausbildung does not
    TRANSCRIPT, //                        legally require a school certificate
    GERMAN_B1,
    AUSBILDUNG_CONTRACT,
  ],
};

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** The requirements this applicant actually sees. */
export function requirementsFor(
  category: VisaCategory,
  answers: ChecklistAnswers,
): Requirement[] {
  return CHECKLISTS[category].filter(
    (req) => !req.appliesTo || req.appliesTo(answers),
  );
}

/**
 * Progress for the "x of y documents uploaded" indicator.
 *
 * Only APPLICABLE + REQUIRED items count toward the total. Counting optional
 * or hidden items would leave a user who legitimately skips an optional
 * document permanently short of 100%.
 */
export function checklistProgress(
  category: VisaCategory,
  answers: ChecklistAnswers,
  uploadedCodes: string[],
): { uploaded: number; total: number; canSubmit: boolean } {
  const blocking = requirementsFor(category, answers).filter((r) => r.required);

  const uploaded = blocking.filter((r) =>
    uploadedCodes.includes(r.code),
  ).length;

  return {
    uploaded,
    total: blocking.length,
    canSubmit: uploaded === blocking.length,
  };
}

/** Look up a requirement by code — for rendering an uploaded document's label. */
export function findRequirement(
  category: VisaCategory,
  code: string,
): Requirement | undefined {
  return CHECKLISTS[category].find((r) => r.code === code);
}
