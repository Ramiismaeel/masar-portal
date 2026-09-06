/**
 * Chancenkarte (opportunity card) points self-assessment — § 20b (1) and (2)
 * AufenthG and its annex.
 *
 * ⚠️ THIS IS A SELF-ASSESSMENT, NOT AN ELIGIBILITY DETERMINATION.
 * Everything here is declared by the applicant and verified by nobody. It must
 * never be presented as a decision, only as an indication. Two reasons that
 * matter beyond wording:
 *
 * 1. Reaching 6 points is NOT sufficient on its own. § 20b also sets basic
 *    requirements that gate access to the points route at all — a foreign
 *    qualification of at least two years (or a recognised degree), German at
 *    A1 or English at B2, and a secured livelihood. Someone can score 8 points
 *    here and still not qualify. The UI must say so.
 * 2. Masar is a consultancy, not an authority. Presenting this as a verdict
 *    would be both wrong and a liability.
 *
 * Same shape as checklists.ts / categories.ts: typed config with
 * labelEn/labelAr, read through pick() — one source of truth for both the
 * arithmetic and the display, so a rule can never be shown one way and scored
 * another.
 */

/** § 20b: at least 6 points, together with the basic requirements above. */
export const MIN_POINTS_REQUIRED = 6;

type Option<T extends string> = {
  value: T;
  points: number;
  labelEn: string;
  labelAr: string;
  /**
   * A plain-language explanation shown under the label. Several of these
   * conditions are written in statute language that an applicant cannot
   * reasonably be expected to decode — "adaptation or compensation measures",
   * "§ 18g (1) sentence 2 no. 1" — and a points answer given on a
   * misunderstanding is worse than no calculator, because it produces a
   * confident wrong number.
   */
  hintEn?: string;
  hintAr?: string;
};

/**
 * MUTUALLY EXCLUSIVE GROUPS.
 *
 * These are single-choice on purpose, and it is the most important modelling
 * decision in this file. As checkboxes, an applicant could tick B2 *and* B1
 * *and* A2 and collect 6 points from language alone — the statute awards only
 * the highest level reached. The same trap applies to age (someone 35 or
 * younger is also 40 or younger) and to professional experience. Making them
 * radio groups means the invalid combination cannot be expressed at all,
 * rather than being expressible and then corrected by validation.
 */
/**
 * Full CEFR ladder so the applicant picks the level they actually hold rather
 * than mapping it themselves.
 *
 * Note C1 and C2 also score 3, not more: the annex caps the German line at
 * B2. Someone with C2 has not earned extra points, they have simply cleared
 * the top band — showing them 3 is correct, and asking them to select "B2" to
 * describe a C2 certificate would be both confusing and a source of wrong
 * answers. A1 scores 0 here but is NOT worthless: it is one way to satisfy
 * § 20b's basic language requirement, which sits outside the points table.
 */
export const GERMAN_LEVELS = [
  { value: "none", points: 0, labelEn: "None", labelAr: "لا شيء" },
  { value: "a1", points: 0, labelEn: "A1", labelAr: "A1" },
  { value: "a2", points: 1, labelEn: "A2", labelAr: "A2" },
  { value: "b1", points: 2, labelEn: "B1", labelAr: "B1" },
  { value: "b2", points: 3, labelEn: "B2", labelAr: "B2" },
  { value: "c1", points: 3, labelEn: "C1", labelAr: "C1" },
  { value: "c2", points: 3, labelEn: "C2", labelAr: "C2" },
] as const satisfies readonly Option<string>[];

/**
 * English earns a point only from C1 up — that is the single English line in
 * the annex. B2 English scores ZERO here despite being significant elsewhere:
 * it is an alternative way to meet § 20b's basic language requirement. This is
 * a place where the UI must not imply "more is always points", or a B2 English
 * speaker will think the calculator is broken.
 */
export const ENGLISH_LEVELS = [
  { value: "none", points: 0, labelEn: "None", labelAr: "لا شيء" },
  { value: "a1", points: 0, labelEn: "A1", labelAr: "A1" },
  { value: "a2", points: 0, labelEn: "A2", labelAr: "A2" },
  { value: "b1", points: 0, labelEn: "B1", labelAr: "B1" },
  { value: "b2", points: 0, labelEn: "B2", labelAr: "B2" },
  { value: "c1", points: 1, labelEn: "C1", labelAr: "C1" },
  { value: "c2", points: 1, labelEn: "C2", labelAr: "C2" },
] as const satisfies readonly Option<string>[];

/**
 * Only work in a job your own training or degree qualifies you for counts —
 * a nurse's years in a restaurant do not. That condition is easy to miss in
 * the statute wording, so the UI states it above the select.
 */
export const EXPERIENCE_LEVELS = [
  {
    value: "fiveInSeven",
    points: 3,
    labelEn: "5 years or more, within the last 7 years",
    labelAr: "5 سنوات أو أكثر، خلال آخر 7 سنوات",
  },
  {
    value: "twoInFive",
    points: 2,
    labelEn: "2 years or more, within the last 5 years",
    labelAr: "سنتان أو أكثر، خلال آخر 5 سنوات",
  },
  {
    value: "none",
    points: 0,
    labelEn: "Less than 2 years",
    labelAr: "أقل من سنتين",
  },
] as const satisfies readonly Option<string>[];

export const AGE_BANDS = [
  {
    value: "under35",
    points: 2,
    labelEn: "35 or younger",
    labelAr: "35 سنة أو أقل",
  },
  {
    value: "under40",
    points: 1,
    labelEn: "36 to 40",
    labelAr: "من 36 إلى 40 سنة",
  },
  {
    value: "over40",
    points: 0,
    labelEn: "41 or older",
    labelAr: "41 سنة أو أكثر",
  },
] as const satisfies readonly Option<string>[];

export type GermanLevel = (typeof GERMAN_LEVELS)[number]["value"];
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number]["value"];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]["value"];
export type AgeBand = (typeof AGE_BANDS)[number]["value"];

/**
 * INDEPENDENT CONDITIONS — each stands alone and adds if true.
 *
 * German and English are separate lines in the annex and stack: B2 German plus
 * C1 English is 3 + 1 = 4, not 3.
 */
export const POINT_FLAGS = [
  {
    value: "adaptationRequired",
    points: 4,
    labelEn: "My foreign qualification is partly recognised in Germany",
    labelAr: "مؤهلي الأجنبي معترف به جزئيًا في ألمانيا",
    hintEn:
      "A German authority has reviewed your training and decided it is not yet fully equivalent — you need extra training, a test, or adaptation measures first. If your qualification is already FULLY recognised, you do not need the Opportunity Card and should ask us about the skilled worker visa instead.",
    hintAr:
      "راجعت جهة ألمانية مختصة تدريبك وقررت أنه غير معادل بالكامل بعد — تحتاج إلى تدريب إضافي أو اختبار أو تدابير تكييف أولًا. إذا كان مؤهلك معترفًا به بالكامل، فلا تحتاج إلى بطاقة الفرص، واسألنا عن تأشيرة العمالة الماهرة بدلًا من ذلك.",
  },
  {
    value: "shortageOccupation",
    points: 1,
    labelEn: "My training or degree is in a shortage occupation",
    labelAr: "لدي خبرة أو تدريب في مهنة مطلوبة جداً",
    hintEn:
      "Occupations Germany is officially short of — for example nursing and care, IT, engineering, and many skilled trades. Ask us if you are not sure whether yours counts.",
    hintAr:
      "مهن تعاني ألمانيا رسميًا من نقص فيها — مثل التمريض والرعاية، وتقنية المعلومات، والهندسة، والعديد من المهن الحرفية. اسألنا إذا لم تكن متأكدًا.",
  },
  {
    value: "residedInGermany",
    points: 1,
    labelEn:
      "I have lived in Germany for at least 6 months in the last 5 years",
    labelAr: "أقمت في ألمانيا 6 أشهر على الأقل خلال آخر 5 سنوات",
    hintEn:
      "Legal residence, without interruption. Short visits and tourist stays do not count.",
    hintAr: "إقامة قانونية دون انقطاع. الزيارات القصيرة والسياحية لا تُحتسب.",
  },
  {
    value: "partnerApplying",
    points: 1,
    labelEn: "My spouse or registered partner is applying together with me",
    labelAr: "زوجي أو شريكي المسجّل يقدّم الطلب معي",
    hintEn:
      "They must also meet the Opportunity Card requirements, apply at the same office, and travel to Germany with you.",
    hintAr:
      "يجب أن يستوفي شروط بطاقة الفرص أيضًا، وأن يقدّم في نفس المكتب، وأن يسافر معك إلى ألمانيا.",
  },
] as const satisfies readonly Option<string>[];

export type PointFlag = (typeof POINT_FLAGS)[number]["value"];

export type PointsAnswers = {
  germanLevel?: GermanLevel;
  englishLevel?: EnglishLevel;
  experience?: ExperienceLevel;
  ageBand?: AgeBand;
  flags?: PointFlag[];
};

export type PointsLine = {
  labelEn: string;
  labelAr: string;
  points: number;
};

export type PointsResult = {
  total: number;
  /** Only the scoring lines, for showing the applicant how the total is built. */
  lines: PointsLine[];
  meetsThreshold: boolean;
};

function findOption<T extends string>(
  options: readonly Option<T>[],
  value: string | undefined,
): Option<T> | undefined {
  return options.find((option) => option.value === value);
}

/**
 * The single scoring function. The UI must never add points itself — a
 * calculator that disagrees with the server about the total is how someone
 * gets told they qualify and then finds out they don't.
 */
export function calculatePoints(answers: PointsAnswers): PointsResult {
  const lines: PointsLine[] = [];

  const german = findOption(GERMAN_LEVELS, answers.germanLevel);
  const english = findOption(ENGLISH_LEVELS, answers.englishLevel);
  const experience = findOption(EXPERIENCE_LEVELS, answers.experience);
  const age = findOption(AGE_BANDS, answers.ageBand);

  for (const [prefixEn, prefixAr, option] of [
    ["German", "الألمانية", german],
    ["English", "الإنجليزية", english],
    ["Experience", "الخبرة", experience],
    ["Age", "العمر", age],
  ] as const) {
    if (option && option.points > 0) {
      lines.push({
        labelEn: `${prefixEn}: ${option.labelEn}`,
        labelAr: `${prefixAr}: ${option.labelAr}`,
        points: option.points,
      });
    }
  }

  // Deduplicated: a repeated flag in the submitted form must not score twice.
  const chosen = new Set(answers.flags ?? []);
  for (const flag of POINT_FLAGS) {
    if (chosen.has(flag.value)) {
      lines.push({
        labelEn: flag.labelEn,
        labelAr: flag.labelAr,
        points: flag.points,
      });
    }
  }

  const total = lines.reduce((sum, line) => sum + line.points, 0);

  return { total, lines, meetsThreshold: total >= MIN_POINTS_REQUIRED };
}

/** Highest score the table can produce — useful for a progress display. */
export const MAX_POINTS =
  Math.max(...GERMAN_LEVELS.map((o) => o.points)) +
  Math.max(...ENGLISH_LEVELS.map((o) => o.points)) +
  Math.max(...EXPERIENCE_LEVELS.map((o) => o.points)) +
  Math.max(...AGE_BANDS.map((o) => o.points)) +
  POINT_FLAGS.reduce((sum, flag) => sum + flag.points, 0);

export function isGermanLevel(value: unknown): value is GermanLevel {
  return GERMAN_LEVELS.some((o) => o.value === value);
}

export function isEnglishLevel(value: unknown): value is EnglishLevel {
  return ENGLISH_LEVELS.some((o) => o.value === value);
}

export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return EXPERIENCE_LEVELS.some((o) => o.value === value);
}

export function isAgeBand(value: unknown): value is AgeBand {
  return AGE_BANDS.some((o) => o.value === value);
}

export function isPointFlag(value: unknown): value is PointFlag {
  return POINT_FLAGS.some((o) => o.value === value);
}
