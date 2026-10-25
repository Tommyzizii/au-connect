import assert from "node:assert/strict";
import test from "node:test";

import { parseAllLanguages, postLanguageError } from "../lib/postLanguageCheck";

test("checks English profanity and obfuscated spelling in post text", () => {
  assert.match(postLanguageError({ content: "fuck you" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "f4ck you" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "f u c k" }) ?? "", /Post text/);
  assert.equal(postLanguageError({ content: "Hello สวัสดี 你好" }), undefined);
  assert.equal(postLanguageError({ content: "This song is banal" }), undefined);
});

test("checks Thai and Chinese text through Glin and the Thai fallback", () => {
  assert.match(postLanguageError({ content: "มึง" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "มึ ง" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "เชี่ยเอ้ย คุณ" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "เชี่ ย" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "ไอ้เวรเอ๊ย yup buddy" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "操你妈" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "操 你 妈" }) ?? "", /Post text/);
});

test("parses Burmese candidates while retaining the original text", () => {
  const parsed = parseAllLanguages("မင်္ဂလာ ပါ");
  assert.ok(parsed.byLanguage.burmese.includes("မင်္ဂလာပါ"));
  assert.ok(parsed.candidates.includes("မင်္ဂလာ ပါ"));
});

test("checks custom Burmese words in plain, embedded, and separated text", () => {
  assert.match(postLanguageError({ content: "ခွေးကောင်" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "ဒီခွေးကောင်ပဲ" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "ခွေး ကောင်" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "လီးစုပ်ပေး" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "လီး" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "အမေလိုး" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "စောက်ဖုတ်" }) ?? "", /Post text/);
  assert.match(postLanguageError({ content: "လီ း" }) ?? "", /Post text/);
  assert.equal(postLanguageError({ content: "မင်္ဂလာပါ" }), undefined);
});

test("checks text fields used by posts, polls, links, and jobs", () => {
  assert.match(postLanguageError({ title: "shit" }) ?? "", /Post title/);
  assert.match(postLanguageError({ pollOptions: ["Yes", "shit"] }) ?? "", /Poll option/);
  assert.match(postLanguageError({ links: [{ title: "Hello", description: "shit" }] }) ?? "", /Link description/);
  assert.match(postLanguageError({ job: { jobTitle: "shit" } }) ?? "", /Job title/);
});
