import type { CategoryValue } from "@/lib/categories";

/**
 * Wizard shape and the answers it produces.
 *
 * Only two answers in this whole app drive checklist logic — `instructionLanguage`
 * (Study) and `medicalProfession` (Medical). Everything else the wizard collects
 * is typed data for staff, and lives in real columns rather than here.
 */

export const INSTRUCTION_LANGUAGES = [
  { value: "de", labelEn: "German", labelAr: "الألمانية" },
  { value: "en", labelEn: "English", labelAr: "الإنجليزية" },
] as const;

export const MEDICAL_PROFESSIONS = [
  { value: "doctor", labelEn: "Doctor", labelAr: "طبيب" },
  { value: "dentist", labelEn: "Dentist", labelAr: "طبيب أسنان" },
  { value: "pharmacist", labelEn: "Pharmacist", labelAr: "صيدلاني" },
  { value: "nurse", labelEn: "Nurse", labelAr: "ممرض/ممرضة" },
  { value: "other", labelEn: "Other", labelAr: "أخرى" },
] as const;

export type InstructionLanguage =
  (typeof INSTRUCTION_LANGUAGES)[number]["value"];
export type MedicalProfession = (typeof MEDICAL_PROFESSIONS)[number]["value"];

export type WizardAnswers = {
  instructionLanguage?: InstructionLanguage;
  medicalProfession?: MedicalProfession;
};

/**
 * Shape returned by the wizard Server Actions, and its initial value.
 *
 * These live HERE and not in the actions file on purpose: a `"use server"`
 * module may only export async functions. A `type` export is fine (types are
 * erased before the bundler sees them), but a plain object is not — Next strips
 * it, the import arrives empty, and you get "cannot read properties of
 * undefined" at the first field access.
 */
export type WizardStepState = {
  error: string | null;
  fieldErrors: Record<string, string>;
};

export const EMPTY_WIZARD_STATE: WizardStepState = {
  error: null,
  fieldErrors: {},
};

/** currentStep is 0-based, matching the schema default. */
export const STEP_IDENTITY = 0;
export const STEP_QUESTION = 1;

/** Chancenkarte and Ausbildung have no checklist-driving question — one step only. */
export function hasQuestionStep(category: CategoryValue): boolean {
  return category === "STUDENT" || category === "MEDICAL";
}

export function totalSteps(category: CategoryValue): number {
  return hasQuestionStep(category) ? 2 : 1;
}

/** currentStep === totalSteps means every step is answered. */
export function isWizardComplete(
  category: CategoryValue,
  currentStep: number,
): boolean {
  return currentStep >= totalSteps(category);
}

function isOneOf<T extends readonly { value: string }[]>(
  options: T,
  value: unknown,
): value is T[number]["value"] {
  return (
    typeof value === "string" &&
    options.some((option) => option.value === value)
  );
}

export function isInstructionLanguage(v: unknown): v is InstructionLanguage {
  return isOneOf(INSTRUCTION_LANGUAGES, v);
}

export function isMedicalProfession(v: unknown): v is MedicalProfession {
  return isOneOf(MEDICAL_PROFESSIONS, v);
}

/**
 * Narrow the `data` Json column into a typed object.
 *
 * Prisma types Json as `JsonValue` — it could be a string, a number, null, or an
 * object written by an older version of this code. Never cast it; validate each
 * field and drop anything unrecognised. Bad data in one row must not crash the page.
 */
export function parseAnswers(data: unknown): WizardAnswers {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {};
  }

  const raw = data as Record<string, unknown>;
  const answers: WizardAnswers = {};

  if (isInstructionLanguage(raw.instructionLanguage)) {
    answers.instructionLanguage = raw.instructionLanguage;
  }

  if (isMedicalProfession(raw.medicalProfession)) {
    answers.medicalProfession = raw.medicalProfession;
  }

  return answers;
}
