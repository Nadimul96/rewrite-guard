import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROFILES, payoffLength, profileByName, profileFor } from "../src/profiles.js";

const results = JSON.parse(readFileSync(new URL("../bench/results/benchmark.json", import.meta.url), "utf8"));
const finite = (value: number | null) => (value === null ? Number.POSITIVE_INFINITY : value);

describe("profiles", () => {
	it("chooses a profile by source length", () => {
		expect([0, 1, 4, 5, 11, 12, 5000].map((count) => profileFor(count).name)).toEqual([
			"empty",
			"very_short",
			"very_short",
			"short",
			"short",
			"normal",
			"normal",
		]);
	});

	it("ships exactly the thresholds the committed benchmark calibrated", () => {
		for (const name of ["short", "normal"] as const) {
			const calibrated = results.thresholds.calibrated[name];
			const shipped = profileByName(name);
			expect(shipped.ordered).toBe(calibrated.ordered);
			expect(shipped.lexical).toBe(calibrated.lexical);
			expect(shipped.orderRetention).toBe(calibrated.orderRetention);
			expect(shipped.payoff).toBe(calibrated.payoff);
			expect(shipped.maxMissingRun).toBe(finite(calibrated.maxMissingRun));
			expect(shipped.maxMovedRun).toBe(finite(calibrated.maxMovedRun));
		}
		expect(PROFILES).toHaveLength(4);
	});

	it("treats 18% of the text, between 1 and 12 tokens, as the payoff", () => {
		expect([0, 1, 5, 20, 100].map(payoffLength)).toEqual([0, 1, 1, 4, 12]);
	});
});
