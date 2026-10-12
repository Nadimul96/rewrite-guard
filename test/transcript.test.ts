import { describe, expect, it } from "vitest";
import { alignTranscript, validateTimedWords } from "../src/transcript.js";

describe("alignTranscript", () => {
	it("keeps the exact script text while using measured timing", () => {
		const result = alignTranscript(
			"Hey, Mom — this is wild!",
			[
				{ text: "hey", start: 0, end: 0.22 },
				{ text: "mom", start: 0.28, end: 0.5 },
				{ text: "this", start: 0.68, end: 0.85 },
				{ text: "is", start: 0.88, end: 0.96 },
				{ text: "wild", start: 1, end: 1.32 },
			],
			{ audioDuration: 1.4 },
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.words.map(({ text, start, end }) => ({ text, start, end }))).toEqual([
			{ text: "Hey,", start: 0, end: 0.22 },
			{ text: "Mom", start: 0.28, end: 0.5 },
			{ text: "this", start: 0.68, end: 0.85 },
			{ text: "is", start: 0.88, end: 0.96 },
			{ text: "wild!", start: 1, end: 1.32 },
		]);
		expect(result.words.every((word) => word.timing === "measured")).toBe(true);
	});

	it("fills only a small unheard run inside a measured gap", () => {
		const result = alignTranscript(
			"I really hated that entire night.",
			[
				{ text: "I", start: 0, end: 0.1 },
				{ text: "hated", start: 0.5, end: 0.78 },
				{ text: "that", start: 0.82, end: 0.96 },
				{ text: "entire", start: 1, end: 1.24 },
				{ text: "night", start: 1.28, end: 1.55 },
			],
			{ audioDuration: 1.6 },
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.words.map((word) => word.text)).toEqual([
			"I",
			"really",
			"hated",
			"that",
			"entire",
			"night.",
		]);
		expect(result.words[1]).toEqual({
			text: "really",
			start: 0.1,
			end: 0.5,
			timing: "interpolated",
			transcriptIndex: null,
		});
	});

	it("fails with a reason instead of guessing", () => {
		const weak = alignTranscript("one two three four five", [
			{ text: "totally", start: 0, end: 0.2 },
			{ text: "different", start: 0.3, end: 0.6 },
		]);
		expect(weak).toMatchObject({ ok: false, reason: "low_script_match" });

		const backwards = alignTranscript("one two", [
			{ text: "one", start: 0.4, end: 0.6 },
			{ text: "two", start: 0.2, end: 0.3 },
		]);
		expect(backwards).toMatchObject({ ok: false, reason: "invalid_timing" });

		const gapless = alignTranscript(
			"I really hated that entire night",
			[
				{ text: "I", start: 0, end: 0.2 },
				{ text: "hated", start: 0.2, end: 0.45 },
				{ text: "that", start: 0.5, end: 0.62 },
				{ text: "entire", start: 0.66, end: 0.8 },
				{ text: "night", start: 0.84, end: 1 },
			],
			{ audioDuration: 1 },
		);
		expect(gapless).toMatchObject({ ok: false, reason: "gap_too_small" });
	});

	it("rejects a transcript full of words the script never had", () => {
		const result = alignTranscript("the quick brown fox", [
			{ text: "the", start: 0, end: 0.1 },
			{ text: "uh", start: 0.1, end: 0.2 },
			{ text: "quick", start: 0.2, end: 0.3 },
			{ text: "um", start: 0.3, end: 0.4 },
			{ text: "brown", start: 0.4, end: 0.5 },
			{ text: "like", start: 0.5, end: 0.6 },
			{ text: "fox", start: 0.6, end: 0.7 },
		]);
		expect(result).toMatchObject({ ok: false, reason: "low_transcript_match" });
	});

	it("rejects long unheard runs and invalid durations", () => {
		const transcript = [
			{ text: "one", start: 0, end: 0.2 },
			{ text: "six", start: 3, end: 3.2 },
			{ text: "seven", start: 3.3, end: 3.5 },
			{ text: "eight", start: 3.6, end: 3.8 },
			{ text: "nine", start: 3.9, end: 4.1 },
			{ text: "ten", start: 4.2, end: 4.4 },
			{ text: "eleven", start: 4.5, end: 4.7 },
			{ text: "twelve", start: 4.8, end: 5 },
			{ text: "thirteen", start: 5.1, end: 5.3 },
			{ text: "fourteen", start: 5.4, end: 5.6 },
			{ text: "fifteen", start: 5.7, end: 5.9 },
			{ text: "sixteen", start: 6, end: 6.2 },
			{ text: "seventeen", start: 6.3, end: 6.5 },
			{ text: "eighteen", start: 6.6, end: 6.8 },
			{ text: "nineteen", start: 6.9, end: 7.1 },
			{ text: "twenty", start: 7.2, end: 7.4 },
		];
		const script =
			"one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty";
		expect(alignTranscript(script, transcript)).toMatchObject({
			ok: false,
			reason: "unmatched_run_too_long",
		});
		expect(alignTranscript("one", [{ text: "one", start: 0, end: 1 }], { audioDuration: -1 })).toMatchObject({
			ok: false,
			reason: "invalid_duration",
		});
		expect(alignTranscript("   ", [{ text: "one", start: 0, end: 1 }])).toMatchObject({
			ok: false,
			reason: "empty_script",
		});
	});
});

describe("validateTimedWords", () => {
	it("accepts a monotonic track and rejects overlap, reversal and empty spans", () => {
		expect(
			validateTimedWords([
				{ text: "One,", start: 0, end: 0.2 },
				{ text: "two.", start: 0.2, end: 0.5 },
			]),
		).toBeNull();
		expect(
			validateTimedWords([
				{ text: "one", start: 0, end: 0.4 },
				{ text: "two", start: 0.3, end: 0.5 },
			]),
		).toMatch(/before the previous word ends/);
		expect(validateTimedWords([{ text: "one", start: 0.5, end: 0.2 }])).toMatch(/empty or negative/);
		expect(validateTimedWords([{ text: "bad", start: 0.3, end: 0.3 }])).toMatch(/empty or negative/);
		expect(validateTimedWords([{ text: " ", start: 0, end: 1 }])).toMatch(/no text/);
		expect(validateTimedWords([{ text: "nan", start: Number.NaN, end: 1 }])).toMatch(/non-finite/);
	});
});
