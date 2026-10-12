import { describe, expect, it } from "vitest";
import { anchorSegments } from "../src/anchor.js";

describe("anchorSegments", () => {
	it("anchors each segment to the source span it covers", () => {
		const source = "I met Maya at noon. She handed me the jacket. Then her brother laughed.";
		const anchors = anchorSegments(source, [
			"I met Maya at noon.",
			"She handed me the jacket.",
			"Then her brother laughed.",
		]);
		expect(
			anchors.map((anchor) => anchor.source && source.slice(anchor.source.start, anchor.source.end)),
		).toEqual(["I met Maya at noon", "She handed me the jacket", "Then her brother laughed"]);
	});

	it("does not let a common word in an early segment swallow later source text", () => {
		// A greedy first-forward-hit matcher anchors "me" in segment 0 to the
		// "me" in the second sentence, then cannot anchor segment 1 at all.
		const source = "Maya called from work. Then she told me the train was gone. I ran to the station.";
		const anchors = anchorSegments(source, [
			"Maya called me from work.",
			"Then she told me the train was gone.",
			"I ran to the station.",
		]);
		expect(
			anchors.map((anchor) => anchor.source && [anchor.source.startToken, anchor.source.endToken]),
		).toEqual([
			[0, 4],
			[4, 12],
			[12, 17],
		]);
		expect(anchors[0]?.matchRatio).toBe(0.8);
	});

	it("returns no anchor for a segment that does not match the source", () => {
		const anchors = anchorSegments("The pump failed at noon.", ["Completely different words here."]);
		expect(anchors[0]?.source).toBeNull();
		expect(anchors[0]?.matchRatio).toBe(0);
	});

	it("keeps anchors monotonic when segments arrive out of order", () => {
		const source = "alpha beta gamma delta epsilon zeta eta theta";
		const anchors = anchorSegments(source, ["epsilon zeta eta theta", "alpha beta gamma delta"]);
		const anchored = anchors.filter((anchor) => anchor.source !== null);
		expect(anchored).toHaveLength(1);
	});
});
