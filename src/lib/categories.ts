import {
  GraduationCap,
  Briefcase,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the four application categories.
 *
 * `value` matches the Prisma `Category` enum member exactly, but is declared as
 * a plain string literal on purpose: this file is imported by Client Components
 * (wizard, dashboard) and we do not want the generated Prisma client pulled into
 * the browser bundle. The `satisfies` check below is what keeps the two in sync.
 *
 * UI RULE: never render `value`. `JOB_SEEKER` is shown to users as
 * "Chancenkarte" — that mismatch is deliberate and permanent.
 */
export const CATEGORIES = [
  {
    value: "STUDENT",
    labelEn: "Study",
    labelAr: "الدراسة",
    blurbEn:
      "Apply for a German student visa for a bachelor's or master's programme.",
    blurbAr:
      "التقديم على تأشيرة دراسة في ألمانيا لمرحلة البكالوريوس أو الماجستير.",
    icon: GraduationCap,
  },
  {
    value: "JOB_SEEKER",
    labelEn: "Chancenkarte",
    labelAr: "بطاقة الفرص",
    blurbEn:
      "The German opportunity card for qualified professionals looking for work.",
    blurbAr: "بطاقة الفرص الألمانية للمهنيين المؤهلين الباحثين عن عمل.",
    icon: Briefcase,
  },
  {
    value: "MEDICAL",
    labelEn: "Medical (D16)",
    labelAr: "التعديل الطبي",
    blurbEn: "Recognition of a medical qualification and the D16 visa process.",
    blurbAr: "معادلة الشهادة الطبية وإجراءات تأشيرة D16.",
    icon: Stethoscope,
  },
  {
    value: "AUSBILDUNG",
    labelEn: "Ausbildung",
    labelAr: "الأوسبيلدونغ",
    blurbEn:
      "Vocational training in Germany with a signed Ausbildung contract.",
    blurbAr: "التدريب المهني في ألمانيا بعقد أوسبيلدونغ موقّع.",
    icon: Wrench,
  },
] as const satisfies readonly {
  value: string;
  labelEn: string;
  labelAr: string;
  blurbEn: string;
  blurbAr: string;
  icon: LucideIcon;
}[];

/** Union derived from the data, not hand-written. Add a category → this widens automatically. */
export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export type CategoryMeta = (typeof CATEGORIES)[number];

const BY_VALUE = new Map<string, CategoryMeta>(
  CATEGORIES.map((c) => [c.value, c]),
);

/** Returns undefined for unknown input — use this to validate `?category=` query params. */
export function findCategory(value: string | null | undefined) {
  if (!value) return undefined;
  return BY_VALUE.get(value);
}

export function isCategoryValue(value: unknown): value is CategoryValue {
  return typeof value === "string" && BY_VALUE.has(value);
}
