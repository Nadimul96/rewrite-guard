import { describe, expect, it } from "vitest";
import { checkFidelity } from "../src/check.js";
import { longestSpan } from "../src/runs.js";

const length = (status: Uint8Array, glue: Uint8Array) => {
	const span = longestSpan(status, glue);
	return span ? span.end - span.start : 0;
};

// "x" marks a set flag: a token with the status, or a function word.
const flags = (pattern: string) => Uint8Array.from(pattern, (char) => (char === "x" ? 1 : 0));

describe("longestSpan", () => {
	it("measures blocks of content words with the status", () => {
		expect(length(flags("..xxx.."), flags("......."))).toBe(3);
		expect(length(flags("......."), flags("......."))).toBe(0);
	});

	it("bridges function words inside a block and absorbs those at its edges", () => {
		expect(length(flags("xx.xx"), flags("..x.."))).toBe(5);
		expect(length(flags(".xx."), flags(".x.."))).toBe(2);
	});

	it("returns the token range of the block", () => {
		expect(longestSpan(flags("..xxx.."), flags("......."))).toEqual({ start: 2, end: 5 });
		expect(longestSpan(flags("......."), flags("......."))).toBeNull();
	});

	it("never starts a block on function words alone", () => {
		expect(length(flags("xx"), flags("xx"))).toBe(0);
	});

	it("keeps a reordered sentence as one block when the alignment borrows its glue", () => {
		const report = checkFidelity(
			"I missed the early train to the city. Then I called Maya from the empty platform. Finally we found the jacket in her car.",
			"Finally we found the jacket in her car. Then I called Maya from the empty platform. I missed the early train to the city.",
		);
		expect(report.metrics.longestMovedRun).toBeGreaterThanOrEqual(8);
		expect(report.passes).toBe(false);
	});
});
