import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkFidelity } from "../src/check.js";
import { lcsAlignment, lcsLength } from "../src/lcs.js";
import { tokenNorms } from "../src/tokenize.js";

// Plain content words: no contractions, fillers, glue or number words, so a
// space-joined list tokenizes back to exactly the same list.
const VOCABULARY = [
	"river",
	"lantern",
	"courier",
	"harbor",
	"ledger",
	"orchard",
	"signal",
	"copper",
	"window",
	"meadow",
	"engine",
	"parcel",
	"garden",
	"tunnel",
	"silver",
	"market",
];
const word = fc.constantFrom(...VOCABULARY);
const sentence = fc.array(word, { minLength: 1, maxLength: 40 });

describe("properties: checkFidelity", () => {
	it("any text is a faithful rewrite of itself", () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 300 }), (text) => {
				const report = checkFidelity(text, text);
				expect(report.passes).toBe(true);
				expect(report.metrics.orderedCoverage).toBe(1);
				expect(report.missing).toEqual([]);
				expect(report.novel).toEqual([]);
				expect(report.moved).toEqual([]);
			}),
		);
	});

	it("identity holds for realistic prose with punctuation and casing changes", () => {
		fc.assert(
			fc.property(sentence, fc.boolean(), (words, upper) => {
				const source = `${words.join(" ")}.`;
				const rewrite = upper ? source.toUpperCase() : words.join(", ");
				expect(checkFidelity(source, rewrite).passes).toBe(true);
			}),
		);
	});

	it("deleting more words never increases coverage", () => {
		fc.assert(
			fc.property(
				sentence.chain((words) =>
					fc.tuple(fc.constant(words), fc.shuffledSubarray([...words.keys()], { minLength: words.length })),
				),
				([words, deletionOrder]) => {
					const source = words.join(" ");
					let previous = { ordered: 1, lexical: 1 };
					for (let deleted = 1; deleted <= deletionOrder.length; deleted += 1) {
						const removed = new Set(deletionOrder.slice(0, deleted));
						const rewrite = words.filter((_, index) => !removed.has(index)).join(" ");
						const { metrics } = checkFidelity(source, rewrite);
						expect(metrics.orderedCoverage).toBeLessThanOrEqual(previous.ordered);
						expect(metrics.lexicalCoverage).toBeLessThanOrEqual(previous.lexical);
						previous = { ordered: metrics.orderedCoverage, lexical: metrics.lexicalCoverage };
					}
					expect(previous).toEqual({ ordered: 0, lexical: 0 });
				},
			),
		);
	});

	it("inserting an unseen name, place or number is flagged as novel", () => {
		const entity = fc.oneof(
			fc.stringMatching(/^[A-Z][a-z]{3,8}$/).map((name) => `Zq${name.toLowerCase()}`),
			fc.integer({ min: 100, max: 99_999 }).map((value) => `${value}`),
		);
		fc.assert(
			fc.property(sentence, entity, fc.nat(), (words, inserted, at) => {
				const position = at % (words.length + 1);
				const rewrite = [...words.slice(0, position), inserted, ...words.slice(position)].join(" ");
				const report = checkFidelity(words.join(" "), rewrite);
				expect(report.passes).toBe(false);
				expect(report.novel.map((token) => token.norm)).toContain(tokenNorms(inserted)[0]);
				expect(report.failures.map((failure) => failure.code)).toContain("novel_tokens");
			}),
		);
	});

	it("matched counts are consistent: in-order plus moved equals lexical overlap", () => {
		fc.assert(
			fc.property(sentence, sentence, (left, right) => {
				const report = checkFidelity(left.join(" "), right.join(" "));
				const overlap = VOCABULARY.reduce(
					(sum, token) =>
						sum +
						Math.min(
							left.filter((item) => item === token).length,
							right.filter((item) => item === token).length,
						),
					0,
				);
				expect(report.counts.matchedLexically).toBe(overlap);
				expect(report.counts.matchedInOrder + report.moved.length).toBe(overlap);
				expect(report.missing.length + overlap).toBe(left.length);
			}),
		);
	});
});

describe("properties: LCS", () => {
	const tokens = fc.array(fc.constantFrom("a", "b", "c", "d"), { maxLength: 60 });

	it("matches a reference dynamic program", () => {
		fc.assert(
			fc.property(tokens, tokens, (a, b) => {
				expect(lcsLength(a, b)).toBe(referenceLcs(a, b));
			}),
		);
	});

	it("produces a valid alignment of the optimal length, symmetric in length", () => {
		fc.assert(
			fc.property(tokens, tokens, (a, b) => {
				const pairs = lcsAlignment(a, b);
				expect(pairs).toHaveLength(lcsLength(a, b));
				expect(lcsLength(b, a)).toBe(pairs.length);
				let previous: [number, number] = [-1, -1];
				for (const pair of pairs) {
					expect(pair[0]).toBeGreaterThan(previous[0]);
					expect(pair[1]).toBeGreaterThan(previous[1]);
					expect(a[pair[0]]).toBe(b[pair[1]]);
					previous = pair;
				}
			}),
		);
	});

	it("handles inputs large enough to force Hirschberg recursion", () => {
		const long = fc.array(fc.constantFrom("a", "b", "c", "d", "e"), { minLength: 100, maxLength: 220 });
		fc.assert(
			fc.property(long, long, (a, b) => {
				expect(lcsAlignment(a, b)).toHaveLength(referenceLcs(a, b));
			}),
			{ numRuns: 40 },
		);
	});
});

function referenceLcs(a: readonly string[], b: readonly string[]): number {
	const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
	for (let i = 1; i <= a.length; i += 1) {
		for (let j = 1; j <= b.length; j += 1) {
			const row = table[i] as number[];
			const above = table[i - 1] as number[];
			row[j] =
				a[i - 1] === b[j - 1]
					? (above[j - 1] as number) + 1
					: Math.max(above[j] as number, row[j - 1] as number);
		}
	}
	return (table[a.length] as number[])[b.length] as number;
}
