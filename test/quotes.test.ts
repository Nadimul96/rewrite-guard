import { describe, expect, it } from "vitest";
import { checkPartition, findQuote } from "../src/quotes.js";

const source = "The committee met on Monday. It did not approve the budget, and the vote was 5 to 4.";

describe("findQuote", () => {
	it("finds a verbatim quote and returns the source's own text", () => {
		expect(findQuote(source, "it did NOT approve the budget")).toEqual({
			text: "It did not approve the budget,",
			start: 29,
			end: 59,
			startWord: 5,
			endWord: 11,
		});
	});

	it("rejects a quote with a changed word", () => {
		expect(findQuote(source, "It did approve the budget")).toBeNull();
		expect(findQuote(source, "the vote was 6 to 4")).toBeNull();
	});

	it("searches only inside the requested word range", () => {
		expect(findQuote(source, "The committee met", { fromWord: 1 })).toBeNull();
		expect(findQuote(source, "the vote", { toWord: 10 })).toBeNull();
		expect(findQuote(source, "")).toBeNull();
	});
});

describe("checkPartition", () => {
	it("accepts parts that cover the source exactly once", () => {
		expect(
			checkPartition(source, [
				"The committee met on Monday.",
				"It did not approve the budget, and the vote was 5 to 4.",
			]),
		).toEqual({
			ok: true,
		});
	});

	it("rejects an edited, empty, incomplete or overlong partition", () => {
		expect(
			checkPartition(source, [
				"The committee met on Monday.",
				"It did approve the budget, and the vote was 5 to 4.",
			]),
		).toMatchObject({
			ok: false,
			part: 1,
			word: 7,
			reason: "mismatch",
		});
		expect(checkPartition(source, ["The committee met on Monday.", "  "])).toMatchObject({
			reason: "empty_part",
		});
		expect(checkPartition(source, ["The committee met on Monday."])).toMatchObject({ reason: "incomplete" });
		expect(checkPartition("One two.", ["One two.", "three"])).toMatchObject({
			reason: "extra_text",
			part: 1,
		});
	});
});
