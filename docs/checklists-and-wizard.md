# Masar Portal — Document Checklists (v2, final)

Source: `visa_requirements_updated.pdf` (August 2026). Supersedes the four service PDFs for
checklist purposes.

**Confirmed by Masar:**
- D16 is a **single phase** — Masar handles the Bescheid process; the applicant only uploads the
  documents below. The two-stage design is dropped.
- The Chancenkarte is labelled **"Chancenkarte"** in the UI. Internal enum stays `JOB_SEEKER`.

---

## 1. Core documents — required in all four categories

| Code | EN | AR |
|---|---|---|
| `PASSPORT` | Valid passport | جواز سفر ساري المفعول |
| `BIOMETRIC_PHOTO` | Recent biometric photos | صور شخصية بيومترية حديثة |
| `GRADUATION_CERTIFICATE` | Graduation certificate | مصدقة التخرج |
| `TRANSCRIPT` | Transcript of records | كشف العلامات |
| `GERMAN_B1` | German language certificate, level B1 | شهادة إجادة اللغة الألمانية مستوى B1 |

Every category starts from these five. Nice property: the checklist config can express this as a
shared `CORE` array spread into each category, so a change to the passport wording happens once.

---

## 2. Per-category additions

### Chancenkarte (`JOB_SEEKER`)
No additions. The five core documents only.

### Study (`STUDENT`)

| Code | EN | Rule |
|---|---|---|
| `ENGLISH_CERTIFICATE` | English language certificate | **Conditional** — only when the programme is taught in English. Marked اختياري (optional). |

### Medical D16 (`MEDICAL`)

| Code | EN | AR | Rule |
|---|---|---|---|
| `UNIVERSITY_DEGREE` | University degree | الشهادة الجامعية | Required |
| `HOURS_STATEMENT` | Statement of practical & theoretical hours | بيان بعدد الساعات العملية والنظرية | Required |
| `REPEAT_STATEMENT` | Repeat statement (doctors) | بيان معاودة للأطباء | **Optional**, doctors only |
| `CRIMINAL_RECORD` | Criminal record extract | خالصة سجل عدلي / الحكم عليه | Required |
| `BIRTH_CERTIFICATE` | Birth certificate | بيان والدة | Required |
| `CIVIL_REGISTRY_EXTRACT` | Civil registry extract | إخراج قيد | Required |
| `GOOD_CONDUCT` | Good conduct certificate (Ministry of Health or Syndicate) | حسن سيرة وسلوك من وزارة الصحة أو النقابة | Required |
| `PROFESSIONAL_LICENSE` | Professional practice licence | ترخيص مزاولة المهنة | Required |
| `MEDICAL_REPORT` | Medical report | تقرير طبي | Required |

Note `BIRTH_CERTIFICATE` and `CIVIL_REGISTRY_EXTRACT` are now **two separate rows**, where the
old PDF combined them. Two codes, two upload slots.

### Ausbildung (`AUSBILDUNG`)

| Code | EN | AR |
|---|---|---|
| `AUSBILDUNG_CONTRACT` | Ausbildung contract | عقد الأوسبيلدونغ |

---

## 3. Three things to confirm

**3.1 — The Ausbildung column was cut off on the right edge of the screenshot.** I read:
- `مصدقة التخرج (اخ…` — is that "(اختياري)" = optional?
- `شهادة إجادة اللغة الا… مستوى B1` — German (الألمانية)?

**3.2 — Large removals vs the original service PDFs.** These no longer appear anywhere:
motivation letter, Europass CV, national visa application form, fee-payment proof, blocked
account, health insurance, accommodation proof, anabin/ZAB recognition, job-search proof,
university admission, language-course registration.

Correct that applicants **do not upload** these because Masar prepares or handles them? I want to
be certain, because a missing checklist item means an incomplete embassy file.

**3.3 — Is `ENGLISH_CERTIFICATE` optional or conditional-required?** The table marks it
اختياري (optional) *and* says "in case of studying in English". Those differ:
- *conditional-required*: if the programme is in English, it must be uploaded to submit
- *optional*: never blocks submission

I have modelled it as **conditional-required** — required when the wizard says the programme is
taught in English, absent otherwise. Say if that's wrong.

---

## 4. What this means for the code

The model needs three flags per requirement, not one:

```ts
type Requirement = {
  code: string;
  labelEn: string;
  labelAr: string;
  required: boolean;                       // blocks submission?
  appliesTo?: (answers: WizardAnswers) => boolean;  // shown at all?
};
```

- **`PASSPORT`** — `required: true`, no condition. Always shown, always blocking.
- **`ENGLISH_CERTIFICATE`** — `required: true` with `appliesTo: a => a.instructionLanguage === "en"`.
  Hidden entirely for German-taught programmes.
- **`REPEAT_STATEMENT`** — `required: false` with `appliesTo: a => a.medicalProfession === "doctor"`.
  Shown to doctors, never blocks.

"Not applicable" and "optional" are genuinely different states, and the progress counter must
treat them differently: *"6 of 9 required documents uploaded"* should not count a hidden or
optional item. Getting this wrong means users who can never reach 100%.

---

## 5. Wizard questions the checklist depends on

The conditions above are the *reason* certain wizard questions exist. Minimum set:

| Category | Question | Drives |
|---|---|---|
| Study | Is your programme taught in German or English? | `ENGLISH_CERTIFICATE` |
| Medical | Your profession: doctor / dentist / pharmacist / nurse / other | `REPEAT_STATEMENT` |

Everything else in the wizard is information for Masar's staff rather than checklist logic — so
the wizard can stay short. Good outcome: fewer questions, less drop-off, and applicants in Syria
filling this on a phone will thank you.
