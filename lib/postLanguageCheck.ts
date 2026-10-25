import {
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
} from "obscenity";
import { Filter } from "glin-profanity";

type PostLanguageInput = {
  title?: string | null;
  content?: string | null;
  pollOptions?: string[] | null;
  links?: Array<{ title?: string | null; description?: string | null }> | null;
  job?: {
    jobTitle?: string | null;
    companyName?: string | null;
    location?: string | null;
    jobDetails?: string | null;
    jobRequirements?: string[] | null;
  } | null;
};

const englishMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export const burmeseProfanityWords = [
  "ဘောပြားမ",
  "မုဒိမ်းကျင့်",
  "ဂွေးထု",
  "ခန့်တေကြီး",
  "လီးပဲ",
  "လီးကောင်",
  "လီးစား",
  "လီးစုပ်",
  "လီးစုပ်ပေး",
  "လိုးမသား",
  "မေလိုး",
  "မင်းမေစောက်ပတ်",
  "မင်းမေစောက်ပတ်ကိုနှိုက်တာပါ",
  "မင်းမေကိုမင်းလိုး",
  "နှမလိုး",
  "နင့်အမေစောက်ပတ်",
  "နင်ငါ့လီးသွားစုပ်လျက်",
  "ငါ့လီးမင်းထက်ပိုကြီးတယ်",
  "ငါမင်းမေကိုလိုးချင်တယ်",
  "ဖာသည်မ",
  "ဖေလိုးမသား",
  "ဖင်လိုးသားမ",
  "ခွေးကောင်",
  "ခွေးမ",
  "စောက်ပတ်စား",
  "စောက်ပတ်ကုလား",
  "စောက်ကောင်",
  "စောက်ကောင်မ",
  "ဇာနည်အက်စကာ",
  "လီး",
  "လိုး",
  "မအေလိုး",
  "အမေလိုး",
  "စောက်ပတ်",
  "စောက်ဖုတ်",
  "စောက်ခွက်",
  "ခွေးမသား",
  "ဖာမ",
  "ဖာခေါင်း",
] as const;

const glinFilter = new Filter({
  languages: ["english", "thai", "chinese"],
  detectLeetspeak: true,
  customWords: [...burmeseProfanityWords],
});

// Glin's Thai dictionary and word boundaries miss these terms in longer phrases.
const thaiProfanity = ["เชี่ย", "เชี้ย", "เหี้ย", "ไอ้เวร"];

function containsProfanity(text: string): boolean {
  if (englishMatcher.hasMatch(text)) return true;
  return hasProfanity(text, (candidate) =>
    glinFilter.isProfane(candidate) ||
    thaiProfanity.some((word) => candidate.includes(word)) ||
    burmeseProfanityWords.some((word) => candidate.includes(word)),
  );
}

/** Checks the text fields of a post for profanity. */
export function postLanguageError(input: PostLanguageInput): string | undefined {
  const fields: Array<readonly [string, string | null | undefined]> = [
    ["Post title", input.title],
    ["Post text", input.content],
    ...((input.pollOptions ?? []).map((option) => ["Poll option", option] as const)),
    ...((input.links ?? []).flatMap((link) => [
      ["Link title", link.title] as const,
      ["Link description", link.description] as const,
    ])),
    ["Job title", input.job?.jobTitle],
    ["Company name", input.job?.companyName],
    ["Job location", input.job?.location],
    ["Job details", input.job?.jobDetails],
    ...((input.job?.jobRequirements ?? []).map((requirement) => ["Job requirement", requirement] as const)),
  ];

  for (const [label, value] of fields) {
    if (value?.trim() && containsProfanity(value)) {
      return `${label} contains language that is not allowed. Please revise it.`;
    }
  }
}

/** Candidate generation for a local profanity filter such as Glin.
 * Keep the original post unchanged. Check every returned candidate.
 */

export type Language = "english" | "thai" | "chinese" | "burmese";

const INVISIBLE = /[\u00ad\u200b\u2060\ufeff]/gu;
const SEPARATOR = /^[\p{White_Space}\p{P}\p{S}]+$/u;

export function normalizeCommon(input: string): string {
  // NFKC folds full-width Latin letters and other compatibility characters.
  // Preserve combining marks: Thai and Burmese need them.
  return input.normalize("NFKC").toLowerCase().replace(INVISIBLE, "");
}

type Token = { text: string; start: number; end: number };

function tokens(text: string, expression: RegExp): Token[] {
  return [...text.matchAll(expression)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function joinedCandidates(
  text: string,
  expression: RegExp,
  options: {
    maxGap: number;
    maxParts: number;
    maxPartLength: number;
    maxJoinedLength: number;
    accept: (parts: Token[]) => boolean;
  },
): string[] {
  const found: string[] = [];
  const parts = tokens(text, expression);

  for (let start = 0; start < parts.length; start++) {
    let joined = parts[start].text;
    if (joined.length > options.maxPartLength) continue;

    for (
      let end = start + 1;
      end < parts.length && end < start + options.maxParts;
      end++
    ) {
      const gap = text.slice(parts[end - 1].end, parts[end].start);
      if (
        gap.length < 1 ||
        gap.length > options.maxGap ||
        !SEPARATOR.test(gap) ||
        parts[end].text.length > options.maxPartLength
      ) break;

      joined += parts[end].text;
      if (joined.length > options.maxJoinedLength) break;
      if (options.accept(parts.slice(start, end + 1))) found.push(joined);
    }
  }

  return found;
}

export function parseEnglish(input: string): string[] {
  const text = normalizeCommon(input);
  const spaced = joinedCandidates(text, /[a-z]+/gu, {
    maxGap: 16,
    maxParts: 16,
    maxPartLength: 2,
    maxJoinedLength: 24,
    // Join short letter fragments, not arbitrary adjacent English words.
    accept: (parts) =>
      parts.length >= 3 && parts.filter((part) => part.text.length === 1).length >= 2,
  });
  return [text, ...spaced];
}

function parseScript(
  input: string,
  expression: RegExp,
  maxPartLength: number,
): string[] {
  const text = normalizeCommon(input);
  const separated = joinedCandidates(text, expression, {
    maxGap: 8,
    maxParts: 8,
    maxPartLength,
    maxJoinedLength: 32,
    accept: (parts) => parts.length >= 2,
  });
  return [text, ...separated];
}

export function parseThai(input: string): string[] {
  return parseScript(input, /[\p{Script=Thai}]+/gu, 8);
}

export function parseChinese(input: string): string[] {
  // Han characters also appear in Japanese; this is script matching, not
  // language identification or Simplified/Traditional conversion.
  return parseScript(input, /[\p{Script=Han}]+/gu, 4);
}

export function parseBurmese(input: string): string[] {
  return parseScript(input, /[\p{Script=Myanmar}]+/gu, 8);
}

export function parseAllLanguages(input: string): {
  byLanguage: Record<Language, string[]>;
  candidates: string[];
} {
  const byLanguage = {
    english: parseEnglish(input),
    thai: parseThai(input),
    chinese: parseChinese(input),
    burmese: parseBurmese(input),
  };

  return {
    byLanguage,
    candidates: [...new Set(Object.values(byLanguage).flat())],
  };
}

/** Checks the original and parsed candidates with the supplied filter. */
export function hasProfanity(
  input: string,
  isProfane: (candidate: string) => boolean,
): boolean {
  return parseAllLanguages(input).candidates.some(isProfane);
}


