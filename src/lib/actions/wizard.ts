"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCategoryValue, type CategoryValue } from "@/lib/categories";
import {
  STEP_QUESTION,
  hasQuestionStep,
  isInstructionLanguage,
  isLatinName,
  isMedicalProfession,
  isPhoneNumber,
  needsSensitiveDataConsent,
  parseAnswers,
  totalSteps,
  type WizardStepState,
} from "@/lib/wizard";
import {
  calculatePoints,
  isAgeBand,
  isEnglishLevel,
  isExperienceLevel,
  isGermanLevel,
  isPointFlag,
  MIN_POINTS_REQUIRED,
  type AgeBand,
  type EnglishLevel,
  type ExperienceLevel,
  type GermanLevel,
  type PointsAnswers,
} from "@/lib/points";

// NOTE: a "use server" module may export ONLY async functions. `WizardStepState`
// and `EMPTY_WIZARD_STATE` therefore live in @/lib/wizard — the type re-export
// below is safe because types disappear at compile time.
export type { WizardStepState };

/**
 * Loads an application that belongs to the signed-in user.
 *
 * NOTE the `findFirst` with BOTH id and userId, rather than `findUnique({ id })`
 * followed by an ownership check. Same result, but this shape makes it
 * impossible to forget the second half — and forgetting it is the single most
 * common serious bug in apps like this (IDOR: change the id in the URL, read
 * someone else's visa file).
 */
export async function loadOwnedApplication(applicationId: unknown) {
  if (typeof applicationId !== "string" || applicationId.length === 0) {
    return null;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
    select: {
      id: true,
      userId: true,
      category: true,
      status: true,
      currentStep: true,
      data: true,
      sensitiveDataConsentAt: true,
    },
  });

  if (!application || !isCategoryValue(application.category)) return null;

  return { ...application, category: application.category as CategoryValue };
}

/** Where the user goes once every step is answered. */
function afterWizardPath(applicationId: string) {
  return `/applications/${applicationId}`;
}

// ---------------------------------------------------------------------------
// Step 0 — identity
// ---------------------------------------------------------------------------

const PASSPORT_PATTERN = /^[A-Z0-9]{5,15}$/;

export async function saveIdentityStep(
  _prev: WizardStepState,
  formData: FormData,
): Promise<WizardStepState> {
  const application = await loadOwnedApplication(formData.get("applicationId"));

  if (!application) {
    return { error: "Application not found.", fieldErrors: {} };
  }

  if (application.status !== "DRAFT") {
    return {
      error: "This application has been submitted and can no longer be edited.",
      fieldErrors: {},
    };
  }

  const fieldErrors: Record<string, string> = {};

  const fullNameLatin = String(formData.get("fullNameLatin") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const phone = String(formData.get("phone") ?? "").trim();
  const passportNumber = String(formData.get("passportNumber") ?? "")
    .trim()
    .toUpperCase();
  const passportExpiryRaw = String(formData.get("passportExpiry") ?? "").trim();

  if (!isLatinName(fullNameLatin)) {
    fieldErrors.fullNameLatin =
      "Enter your full name in Latin letters, exactly as printed in your passport.";
  }

  if (!isPhoneNumber(phone)) {
    fieldErrors.phone =
      "Enter a valid phone number, including the country code (e.g. +963…).";
  }

  if (!PASSPORT_PATTERN.test(passportNumber)) {
    fieldErrors.passportNumber =
      "Passport numbers are 5–15 letters and digits, no spaces.";
  }

  // Dates arrive as "YYYY-MM-DD" from <input type="date">. Append T00:00:00Z so
  // it is parsed as UTC — without it, the browser's timezone can shift the date
  // by a day, which for an expiry date is a real bug.
  const passportExpiry = passportExpiryRaw
    ? new Date(`${passportExpiryRaw}T00:00:00Z`)
    : null;

  if (!passportExpiry || Number.isNaN(passportExpiry.getTime())) {
    fieldErrors.passportExpiry = "Enter your passport's expiry date.";
  } else if (passportExpiry.getTime() <= Date.now()) {
    fieldErrors.passportExpiry =
      "This passport has expired. You will need to renew it before applying.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: null, fieldErrors };
  }

  // The identity step writes to two tables, so it must be one transaction:
  // a half-saved step (name stored, phone lost) is worse than a failed one.
  // `phone` belongs to the person, not the application — it lives on User.
  const nextStep = hasQuestionStep(application.category)
    ? STEP_QUESTION
    : totalSteps(application.category);

  try {
    await prisma.$transaction([
      prisma.application.update({
        where: { id: application.id },
        data: {
          fullNameLatin,
          passportNumber,
          passportExpiry,
          // Never move currentStep backwards — the user may be editing step 0
          // after already answering step 1.
          currentStep: Math.max(application.currentStep, nextStep),
        },
      }),
      prisma.user.update({
        where: { id: application.userId },
        data: { phone },
      }),
    ]);
  } catch (error) {
    console.error("saveIdentityStep failed", error);
    return {
      error: "Could not save your answers. Please try again.",
      fieldErrors: {},
    };
  }

  revalidatePath(`/applications/${application.id}/wizard`);
  revalidatePath("/dashboard");

  // redirect() throws by design — keep it outside the try/catch above.
  redirect(
    hasQuestionStep(application.category)
      ? `/applications/${application.id}/wizard?step=${STEP_QUESTION}`
      : afterWizardPath(application.id),
  );
}

// ---------------------------------------------------------------------------
// Step 1 — the one category question
// ---------------------------------------------------------------------------

export async function saveQuestionStep(
  _prev: WizardStepState,
  formData: FormData,
): Promise<WizardStepState> {
  const application = await loadOwnedApplication(formData.get("applicationId"));

  if (!application) {
    return { error: "Application not found.", fieldErrors: {} };
  }

  if (application.status !== "DRAFT") {
    return {
      error: "This application has been submitted and can no longer be edited.",
      fieldErrors: {},
    };
  }

  if (!hasQuestionStep(application.category)) {
    redirect(afterWizardPath(application.id));
  }

  // Start from the answers already stored and merge — never overwrite the whole
  // JSON blob with one field, or editing one answer silently erases the others.
  const answers = parseAnswers(application.data);
  const answer = formData.get("answer");

  if (application.category === "STUDENT") {
    if (!isInstructionLanguage(answer)) {
      return {
        error: null,
        fieldErrors: {
          answer: "Choose the language your programme is taught in.",
        },
      };
    }
    answers.instructionLanguage = answer;
  }

  // Set only on the transition from "no consent" to "consent given" — never
  // overwritten by a later save, so it stays proof of the *first* consent.
  let sensitiveDataConsentAt: Date | undefined;

  if (application.category === "MEDICAL") {
    const fieldErrors: Record<string, string> = {};

    if (!isMedicalProfession(answer)) {
      fieldErrors.answer = "Choose your profession.";
    } else {
      answers.medicalProfession = answer;
    }

    if (needsSensitiveDataConsent(application.category)) {
      const alreadyConsented = application.sensitiveDataConsentAt !== null;
      const consented = formData.get("sensitiveDataConsent") === "on";

      if (!alreadyConsented && !consented) {
        fieldErrors.sensitiveDataConsent =
          "You must consent to processing your sensitive documents to continue.";
      } else if (!alreadyConsented) {
        sensitiveDataConsentAt = new Date();
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { error: null, fieldErrors };
    }
  }

  if (application.category === "JOB_SEEKER") {
    const germanLevel = formData.get("germanLevel");
    const englishLevel = formData.get("englishLevel");
    const experience = formData.get("experience");
    const ageBand = formData.get("ageBand");

    const fieldErrors: Record<string, string> = {};
    if (!isGermanLevel(germanLevel)) fieldErrors.germanLevel = "Choose a level.";
    if (!isEnglishLevel(englishLevel))
      fieldErrors.englishLevel = "Choose a level.";
    if (!isExperienceLevel(experience))
      fieldErrors.experience = "Choose an option.";
    if (!isAgeBand(ageBand)) fieldErrors.ageBand = "Choose your age range.";

    if (Object.keys(fieldErrors).length > 0) {
      return { error: null, fieldErrors };
    }

    const points: PointsAnswers = {
      germanLevel: germanLevel as GermanLevel,
      englishLevel: englishLevel as EnglishLevel,
      experience: experience as ExperienceLevel,
      ageBand: ageBand as AgeBand,
      // getAll, so multiple checked boxes all arrive. Unknown values are
      // dropped rather than trusted — the form is client-supplied.
      flags: formData.getAll("flags").filter(isPointFlag),
    };

    answers.points = points;

    // THE GATE. Scored here, on the server, from the values just validated —
    // never from a total the client sent. A number computed in the browser is
    // a number the browser can choose.
    const result = calculatePoints(points);

    if (!result.meetsThreshold) {
      // The answers are still saved below? No — we return before the update,
      // deliberately. Persisting a failing self-assessment would leave the
      // application in a half-answered state that isWizardComplete would
      // still refuse to advance, with nothing telling the applicant why.
      return {
        error: `Your answers come to ${result.total} of the ${MIN_POINTS_REQUIRED} points needed for a Chancenkarte. Please review your answers — if you believe this is wrong, contact Masar and we will check it with you.`,
        fieldErrors: {},
      };
    }
  }

  try {
    await prisma.application.update({
      where: { id: application.id },
      data: {
        data: answers,
        ...(sensitiveDataConsentAt && { sensitiveDataConsentAt }),
        currentStep: Math.max(
          application.currentStep,
          totalSteps(application.category),
        ),
      },
    });
  } catch (error) {
    console.error("saveQuestionStep failed", error);
    return {
      error: "Could not save your answer. Please try again.",
      fieldErrors: {},
    };
  }

  revalidatePath(`/applications/${application.id}/wizard`);
  revalidatePath("/dashboard");

  redirect(afterWizardPath(application.id));
}
