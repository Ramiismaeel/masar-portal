import type { CategoryValue } from "@/lib/categories";

/**
 * Wizard shape and the answers it produces.
 *
 * Only two answers in this whole app drive checklist logic — `instructionLanguage`
 * (Study) and `medicalProfession` (Medical). Everything else the wizard collects
 * is typed data for staff, and lives in real columns rather than here.
 */

/**
 * Passport-name rule, shared between the Server Action's validation
 * (src/lib/actions/wizard.ts, which — being "use server" — cannot export a
 * plain const itself) and the wizard page's name-prefill decision: a
 * signed-up `User.name` is only ever used to prefill `fullNameLatin` when it
 * already satisfies this pattern, never forced in as-is.
 */
// Note the ESCAPED hyphen (`\-`). See PHONE_PATTERN below for why: an
// unescaped one is a syntax error under the `v` flag. This pattern is not
// currently used as an HTML `pattern` attribute, but it is the same latent
// bug, and escaping costs nothing.
const LATIN_NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'\-]{2,79}$/;

export function isLatinName(value: string): boolean {
  return LATIN_NAME_PATTERN.test(value);
}

/**
 * Same reasoning as isLatinName above: one pattern, shared by the Server
 * Action's real validation and the identity form's HTML `pattern` attribute
 * (`.source`, since `pattern` takes a string) — a phone typo shows up
 * instantly via native browser validation instead of a round-trip.
 *
 * THE HYPHEN MUST STAY ESCAPED (`\-`). Browsers compile the HTML `pattern`
 * attribute with the **`v` flag**, whose character-class rules are stricter
 * than ordinary JavaScript regex: an unescaped `-` next to a class escape like
 * `\s` is a syntax error, and the whole attribute is discarded with
 * "Invalid regular expression … Invalid character class" in the console.
 *
 * This is nastier than it sounds, because it fails ASYMMETRICALLY: `.test()`
 * on the server compiles without `v` and works fine, so validation still
 * passes server-side while the browser's native validation silently does
 * nothing. Verified: moving the hyphen to the front of the class does NOT
 * fix it under `v` — only escaping does.
 */
const PHONE_PATTERN = /^\+?[0-9][0-9\s\-]{6,19}$/;

export function isPhoneNumber(value: string): boolean {
  return PHONE_PATTERN.test(value);
}

export const PHONE_PATTERN_SOURCE = PHONE_PATTERN.source;

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

/**
 * Only Medical (D16) applications ever include a criminal record extract or a
 * medical report — the two document types Datenschutz §4 treats as Art. 9/10
 * GDPR sensitive data. Every other category never sees this checkbox.
 */
export function needsSensitiveDataConsent(category: CategoryValue): boolean {
  return category === "MEDICAL";
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
