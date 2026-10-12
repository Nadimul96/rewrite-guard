import { describe, expect, it } from "vitest";
import { lcsAlignment, lcsLength } from "../src/lcs.js";

const words = (text: string) => text.split(" ").filter(Boolean);

describe("lcsLength", () => {
	it("measures the longest in-order overlap", () => {
		expect(lcsLength(words("a b c d e"), words("a c e"))).toBe(3);
		expect(lcsLength(words("a b c"), words("c b a"))).toBe(1);
		expect(lcsLength([], words("a b"))).toBe(0);
	});

	it("does not overflow past 65,535 matched tokens", () => {
		// A 16-bit row (the original implementation) wraps 69,999 to 4,463.
		const source = Array.from({ length: 70_000 }, (_, index) => `w${index % 997}`);
		const rewrite = [...source];
		rewrite[35_000] = "changed";
		expect(lcsLength(source, rewrite)).toBe(69_999);
	});

	it("refuses inputs above the cell budget instead of hanging", () => {
		const left = Array.from({ length: 300 }, (_, index) => `l${index}`);
		const right = Array.from({ length: 300 }, (_, index) => `r${index}`);
		expect(() => lcsLength(left, right, { maxCells: 1_000 })).toThrow(RangeError);
	});
});

describe("lcsAlignment", () => {
	it("returns strictly increasing pairs of equal tokens", () => {
		const a = words("the cat sat on the mat");
		const b = words("a cat sat down on a mat");
		const pairs = lcsAlignment(a, b);
		expect(pairs.map(([i]) => a[i])).toEqual(["cat", "sat", "on", "mat"]);
		for (const [i, j] of pairs) expect(a[i]).toBe(b[j]);
	});

	it("agrees with lcsLength on inputs large enough to recurse", () => {
		const a = Array.from({ length: 400 }, (_, index) => `t${(index * 7) % 23}`);
		const b = Array.from({ length: 350 }, (_, index) => `t${(index * 5) % 19}`);
		expect(lcsAlignment(a, b)).toHaveLength(lcsLength(a, b));
	});
});
