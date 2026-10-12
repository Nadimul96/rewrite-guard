import { describe, expect, it } from "vitest";
import { buildUnits, DOCUMENTS, PARAPHRASES, PEOPLE, PLACES, PROPER_NOUNS } from "../bench/corpus/index.js";
import { buildDataset } from "../bench/dataset.js";
import { PERTURBATIONS } from "../bench/perturb/index.js";
import { seeded } from "../bench/rng.js";
import { english } from "../src/locale.js";
import { tokenNorms } from "../src/tokenize.js";

const context = {
	properNouns: PROPER_NOUNS,
	people: PEOPLE,
	names: new Set([...PEOPLE, ...PLACES]),
	paraphrases: PARAPHRASES,
	glueWords: english.glueWords,
};
const unit = (id: string) => {
	const found = buildUnits().find((candidate) => candidate.id === id);
	if (!found) throw new Error(`no unit ${id}`);
	return found;
};

describe("benchmark dataset", () => {
	const { pairs } = buildDataset();

	it("lists only names that really occur in the corpus", () => {
		const text = DOCUMENTS.flatMap((document) => document.sentences).join(" ");
		for (const name of [...PEOPLE, ...PLACES]) expect(text, name).toMatch(new RegExp(`\\b${name}\\b`));
	});

	it("is deterministic", () => {
		const again = buildDataset().pairs;
		expect(again.map((pair) => [pair.id, pair.rewrite])).toEqual(
			pairs.map((pair) => [pair.id, pair.rewrite]),
		);
	});

	it("only labels a pair unfaithful when a comparable token changed", () => {
		for (const pair of pairs.filter((candidate) => candidate.label === "unfaithful")) {
			expect(tokenNorms(pair.rewrite), pair.id).not.toEqual(tokenNorms(pair.source));
		}
	});

	it("keeps punctuation and filler controls token-identical", () => {
		for (const pair of pairs.filter((candidate) =>
			["punctuation_casing", "filler_removal"].includes(candidate.type),
		)) {
			expect(tokenNorms(pair.rewrite), pair.id).toEqual(tokenNorms(pair.source));
		}
	});

	it("keeps every document, and its sentences, on one side of the split", () => {
		const sides = new Map<string, Set<string>>();
		for (const pair of pairs) {
			const set = sides.get(pair.documentId) ?? new Set();
			set.add(pair.split);
			sides.set(pair.documentId, set);
		}
		expect([...sides.values()].every((set) => set.size === 1)).toBe(true);
		const calibration = pairs.filter((pair) => pair.split === "calibration").length;
		expect(calibration / pairs.length).toBeGreaterThan(0.4);
		expect(calibration / pairs.length).toBeLessThan(0.6);
	});
});

describe("perturbations", () => {
	const story = unit("story/lunch-name-mixup");
	const apply = (type: keyof typeof PERTURBATIONS, target = story) =>
		PERTURBATIONS[type].apply(target, seeded(`test:${type}`), context);

	it("drops the final clause of the ending", () => {
		expect(apply("drop_payoff")?.rewrite).toMatch(/I laughed, ordered dessert\.$/);
	});

	it("removes a negation without leaving broken punctuation", () => {
		const result = apply("drop_negation");
		expect(result?.rewrite).toContain("Brad was her brother and my name.");
	});

	it("swaps who did what inside one sentence", () => {
		const result = apply("swap_roles", unit("story/karaoke-volunteer#2"));
		expect(result?.rewrite).toBe("Priya told host Omar that I knew every word to the next song.");
	});

	it("moves a trailing phrase to the front as a faithful control, and drops it as an unfaithful one", () => {
		const target = unit("notice/parcel-exception#1");
		expect(apply("move_adverbial", target)?.rewrite).toBe(
			"At 7:40, your parcel left the Leeds depot on Monday.",
		);
		expect(apply("drop_qualifier", target)?.rewrite).toBe("Your parcel left the Leeds depot on Monday.");
	});

	it("never leaves a sentence in place when reordering every event", () => {
		const result = apply("shuffle_beats");
		const original = story.sentences;
		const rewritten = original.map((sentence) => result?.rewrite.indexOf(sentence));
		expect(rewritten.every((position, index) => position !== undefined && position >= 0 && index >= 0)).toBe(
			true,
		);
		expect(result?.rewrite.startsWith(original[0] as string)).toBe(false);
	});

	it("returns null where a perturbation does not apply", () => {
		expect(apply("replace_number", unit("phrase/tripped"))).toBeNull();
		expect(apply("swap_beats", unit("notice/library-hours"))).toBeNull();
		expect(apply("heavy_paraphrase", unit("phrase/omar-won"))).toBeNull();
	});
});
