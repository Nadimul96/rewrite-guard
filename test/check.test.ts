import { describe, expect, it } from "vitest";
import { checkFidelity, type FailureCode, type FidelityReport } from "../src/check.js";

const codes = (report: FidelityReport): FailureCode[] => report.failures.map((failure) => failure.code);
const norms = (tokens: readonly { norm: string }[]) => tokens.map((token) => token.norm);

describe("checkFidelity: coverage", () => {
	it("accepts a complete text split across segments", () => {
		const report = checkFidelity(
			"I cleaned my apartment, Maya arrived, and then her brother walked in wearing my missing jacket.",
			"I cleaned my apartment.\nMaya arrived, and then her brother walked in\nwearing my missing jacket.",
		);
		expect(report.passes).toBe(true);
		expect(report.metrics.orderedCoverage).toBe(1);
		expect(report.metrics.lexicalCoverage).toBe(1);
		expect(report.missing).toEqual([]);
	});

	it("rejects a rewrite that drops the payoff", () => {
		const report = checkFidelity(
			"I cleaned my apartment all afternoon before Maya arrived, but then her brother walked in wearing my missing jacket.",
			"I cleaned my apartment all afternoon. Maya arrived.",
		);
		expect(report.passes).toBe(false);
		expect(codes(report)).toContain("lexical_coverage");
		expect(norms(report.missing)).toEqual(expect.arrayContaining(["brother", "walked", "missing", "jacket"]));
	});

	it("rejects reordered beats even when every source word is present", () => {
		const report = checkFidelity(
			"First I missed the train then I called Maya and finally we found the jacket",
			"And finally we found the jacket. Then I called Maya. First I missed the train.",
		);
		expect(report.passes).toBe(false);
		expect(report.metrics.lexicalCoverage).toBe(1);
		expect(report.metrics.orderRetention).toBeLessThan(report.profile.orderRetention);
		expect(codes(report)).toContain("order_retention");
		expect(report.moved.length).toBeGreaterThan(0);
	});

	it("normalizes punctuation, contractions and fillers before comparing", () => {
		const report = checkFidelity(
			"Um, I couldn't—uh—believe it, you know? But I wasn't leaving!",
			"I could not believe it. But I was not leaving.",
		);
		expect(report.passes).toBe(true);
		expect(report.metrics.orderedCoverage).toBe(1);
	});

	it("requires exact retention for very short texts", () => {
		const report = checkFidelity("I tripped.", "I tripped!");
		expect(report.passes).toBe(true);
		expect(report.profile.name).toBe("very_short");
		expect(checkFidelity("I tripped.", "Tripped!").passes).toBe(false);
	});

	it("rejects an unrelated rewrite of a very short text", () => {
		const report = checkFidelity("Maya stole my phone.", "I love pizza.");
		expect(report.passes).toBe(false);
		expect(report.metrics.orderedCoverage).toBe(0);
	});

	it("requires the final span instead of accepting the first 82 percent", () => {
		const source = Array.from({ length: 100 }, (_, index) => `token${index}`).join(" ");
		const rewrite = Array.from({ length: 82 }, (_, index) => `token${index}`).join(" ");
		const report = checkFidelity(source, rewrite);
		expect(report.metrics.lexicalCoverage).toBe(0.82);
		expect(report.passes).toBe(false);
		expect(report.payoff.range).toEqual([88, 100]);
		expect(norms(report.payoff.missing)).toEqual(expect.arrayContaining(["token88", "token99"]));
	});

	it("reports the longest dropped and moved runs", () => {
		const report = checkFidelity(
			"one two three four five six seven eight nine ten eleven twelve thirteen",
			"one two three eight nine ten eleven twelve thirteen four five six seven",
		);
		expect(report.metrics.longestMissingRun).toBe(0);
		expect(report.metrics.longestMovedRun).toBe(4);
		const dropped = checkFidelity(
			"one two three four five six seven eight nine ten eleven twelve thirteen",
			"one two three eight nine ten eleven twelve thirteen",
		);
		expect(dropped.metrics.longestMissingRun).toBe(4);
	});

	it("treats an empty source as passing only an empty rewrite", () => {
		expect(checkFidelity("", "").passes).toBe(true);
		expect(checkFidelity("...", "um").passes).toBe(true);
		expect(codes(checkFidelity("", "Something new"))).toEqual(["unexpected_content"]);
	});
});

describe("checkFidelity: invented facts", () => {
	it("rejects invented words even when every source token remains", () => {
		const report = checkFidelity(
			"Maya stole my phone at lunch today.",
			"Maya stole my phone at lunch today and confessed later.",
		);
		expect(report.passes).toBe(false);
		expect(norms(report.novel)).toEqual(expect.arrayContaining(["confessed", "later"]));
	});

	it("rejects an invented setting", () => {
		const report = checkFidelity(
			"I met Maya and she handed me the missing jacket.",
			"I met Maya at the airport and she handed me the missing jacket.",
		);
		expect(codes(report)).toEqual(["novel_tokens"]);
		expect(norms(report.novel)).toEqual(["airport"]);
		expect(report.novel[0]?.text).toBe("airport");
	});

	it("allows new details only when supplied as evidence", () => {
		const source = "I picked her up because it was late, and then she invited me inside.";
		const rewrite =
			"I picked her up because it was late, after midnight. She kept checking the mirror. Then she invited me inside.";
		expect(checkFidelity(source, rewrite).passes).toBe(false);
		const grounded = checkFidelity(source, rewrite, {
			allowedEvidence: ["It was after midnight and she kept checking the mirror."],
		});
		expect(grounded.novel).toEqual([]);
	});

	it("lets a rewrite add glue words and change grammatical case", () => {
		const report = checkFidelity(
			"I handed Maya my keys before the meeting started.",
			"I handed Maya the keys of mine, then the meeting started.",
		);
		expect(report.novel).toEqual([]);
	});

	it("flags a replaced number by position", () => {
		const source = "The shipment of 40 crates left Rotterdam on Tuesday.";
		const report = checkFidelity(source, "The shipment of 45 crates left Rotterdam on Tuesday.");
		expect(norms(report.novel)).toEqual(["45"]);
		expect(norms(report.missing)).toEqual(["40"]);
		expect(source.slice(report.missing[0]?.start, report.missing[0]?.end)).toBe("40");
	});
});

describe("checkFidelity: protected content", () => {
	it("protects negation even when the remaining coverage is high", () => {
		const report = checkFidelity(
			"I did not steal the phone from Maya yesterday.",
			"I did steal the phone from Maya yesterday.",
		);
		expect(report.passes).toBe(false);
		expect(codes(report)).toContain("negation");
		expect(norms(report.negations.dropped)).toEqual(["not"]);
	});

	it("catches a negation hidden inside a contraction", () => {
		const report = checkFidelity(
			"The courier didn't sign for the parcel.",
			"The courier did sign for the parcel.",
		);
		expect(norms(report.negations.dropped)).toEqual(["not"]);
		expect(report.negations.dropped[0]?.text).toBe("didn't");
	});

	it("catches an added negation", () => {
		const report = checkFidelity(
			"The lab confirmed the sample was contaminated on Friday.",
			"The lab confirmed the sample was not contaminated on Friday.",
		);
		expect(codes(report)).toEqual(expect.arrayContaining(["negation", "novel_tokens"]));
		expect(norms(report.negations.added)).toEqual(["not"]);
	});

	it("enforces the payoff only when asked, and lets a caller waive it", () => {
		const source = "The pump failed at noon and the crew replaced the seal before the evening shift.";
		const rewrite = "The pump failed at noon and the crew replaced the seal.";
		expect(codes(checkFidelity(source, rewrite, { thresholds: { payoff: 0 } }))).not.toContain("payoff");
		const strictEnding = checkFidelity(source, rewrite, { thresholds: { payoff: 1 } });
		expect(codes(strictEnding)).toContain("payoff");
		expect(strictEnding.payoff.missing.map((token) => token.norm)).toEqual(["evening", "shift"]);
		const waived = checkFidelity(source, rewrite, { thresholds: { payoff: 1 }, requirePayoff: false });
		expect(codes(waived)).not.toContain("payoff");
	});

	it("accepts a forced profile and threshold overrides", () => {
		const report = checkFidelity("alpha beta gamma delta epsilon", "alpha beta gamma delta", {
			profile: "normal",
			thresholds: { payoff: 0 },
		});
		expect(report.profile.name).toBe("normal");
		expect(report.profile.payoff).toBe(0);
	});
});
