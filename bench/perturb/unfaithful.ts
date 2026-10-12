import { tokenNorms } from "../../src/tokenize.js";
import type { Unit } from "../corpus/index.js";
import { pick, type Rng, shuffled } from "../rng.js";
import type { Perturbation, PerturbContext } from "./types.js";
import {
	appendBeforeEnd,
	capitalize,
	core,
	deleteWord,
	lowerCore,
	matchCase,
	parts,
	replaceCore,
	splitWords,
	trailingPhrases,
} from "./words.js";

const NEW_NAMES = [
	"Kofi",
	"Ingrid",
	"Mateo",
	"Yusuf",
	"Hana",
	"Oskar",
	"Farida",
	"Lucien",
	"Zainab",
	"Tomasz",
];
const NEW_PLACES = [
	"Denver",
	"Kyoto",
	"Nairobi",
	"Oslo",
	"Perth",
	"Tucson",
	"Gdansk",
	"Quito",
	"Hobart",
	"Lyon",
];
const NUMBER_WORDS = [
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
	"ten",
	"twelve",
	"twenty",
];
const NUMBER_WORD_SET = new Set(["one", ...NUMBER_WORDS, "eleven", "thirty", "forty", "fifty"]);

type Edit = (unit: Unit, rng: Rng, context: PerturbContext) => Perturbation | null;

const joined = (sentences: readonly string[]) => sentences.join(" ");

/**
 * Remove the ending. Prefer the final clause of the last sentence (after its
 * last comma or conjunction), which is how rewrites usually lose a payoff;
 * otherwise drop the last sentence, or the last ~30% of a single sentence.
 */
export const dropPayoff: Edit = (unit) => {
	const last = unit.sentences.length - 1;
	const words = splitWords(unit.sentences[last] as string);
	const clause = finalClauseStart(words);
	if (clause !== null) {
		const kept = endWith(words.slice(0, clause));
		return {
			source: unit.text,
			rewrite: joined(unit.sentences.with(last, kept.join(" "))),
			note: `final clause "${words.slice(clause).join(" ")}" removed`,
		};
	}
	if (unit.sentences.length >= 2) {
		return { source: unit.text, rewrite: joined(unit.sentences.slice(0, -1)), note: "last sentence removed" };
	}
	if (words.length < 2) return null;
	const cut = unit.level === "phrase" ? 1 : Math.max(1, Math.round(words.length * 0.3));
	return {
		source: unit.text,
		rewrite: endWith(words.slice(0, words.length - cut)).join(" "),
		note: `last ${cut} word(s) removed`,
	};
};

const CLAUSE_JOINERS = new Set(["and", "but", "so", "while", "because", "until", "when"]);

/** Index where the final clause starts, if it is at least three words long. */
function finalClauseStart(words: readonly string[]): number | null {
	for (let index = words.length - 3; index >= 3; index -= 1) {
		const previous = words[index - 1] as string;
		if (previous.endsWith(",") || CLAUSE_JOINERS.has(lowerCore(words[index] as string))) return index;
	}
	return null;
}

function endWith(words: readonly string[]): string[] {
	const kept = [...words];
	const last = kept.length - 1;
	kept[last] = `${parts(kept[last] as string).lead}${core(kept[last] as string)}.`;
	return kept;
}

/**
 * Delete about a quarter of the content words, never two in a row: the
 * diffuse loss of detail ("a giant dinosaur costume" becoming "a costume")
 * that no single dropped span reveals.
 */
export const dropDetails: Edit = (unit, rng, context) => {
	const glue = context.glueWords;
	const slots: Array<[number, number]> = [];
	unit.sentences.forEach((sentence, s) => {
		splitWords(sentence).forEach((word, w) => {
			const lower = lowerCore(word);
			if (w > 0 && lower.length > 2 && !glue.has(lower) && !/^\d/.test(lower) && !lower.endsWith("n't")) {
				slots.push([s, w]);
			}
		});
	});
	const target = Math.round(slots.length * 0.25);
	if (target < 2) return null;
	const chosen = new Set<string>();
	for (const [s, w] of shuffled(rng, slots)) {
		if (chosen.size === target) break;
		if (chosen.has(`${s}:${w - 1}`) || chosen.has(`${s}:${w + 1}`)) continue;
		chosen.add(`${s}:${w}`);
	}
	const sentences = unit.sentences.map((sentence, s) => {
		let words = splitWords(sentence);
		for (let w = words.length - 1; w >= 0; w -= 1) {
			if (chosen.has(`${s}:${w}`)) words = deleteWord(words, w);
		}
		return words.join(" ");
	});
	return { source: unit.text, rewrite: joined(sentences), note: `${chosen.size} content words removed` };
};

/** Remove one middle sentence of a document. */
export const dropBeat: Edit = (unit, rng) => {
	if (unit.sentences.length < 3) return null;
	const index = 1 + Math.floor(rng() * (unit.sentences.length - 2));
	const rewrite = joined(unit.sentences.filter((_, position) => position !== index));
	return { source: unit.text, rewrite, note: `sentence ${index + 1} removed` };
};

const NEGATION_SWAPS: Record<string, string | null> = {
	not: null,
	never: null,
	no: null,
	nobody: "somebody",
	nothing: "something",
	none: "some",
	neither: "either",
	nor: "or",
	without: "with",
	cannot: "can",
	"can't": "can",
	"won't": "will",
};

/** Remove one negation: delete "not", or turn "didn't" into "did", "nobody" into "somebody". */
export const dropNegation: Edit = (unit, rng) => {
	const candidates: Array<[number, number]> = [];
	unit.sentences.forEach((sentence, s) => {
		splitWords(sentence).forEach((word, w) => {
			const lower = lowerCore(word);
			if (lower in NEGATION_SWAPS || lower.endsWith("n't")) candidates.push([s, w]);
		});
	});
	if (candidates.length === 0) return null;
	const [s, w] = pick(rng, candidates);
	const words = splitWords(unit.sentences[s] as string);
	const word = words[w] as string;
	const lower = lowerCore(word);
	const swap = lower in NEGATION_SWAPS ? NEGATION_SWAPS[lower] : lower.slice(0, -3);
	const edited =
		swap === null || swap === undefined
			? deleteWord(words, w)
			: words.with(w, replaceCore(word, matchCase(core(word), swap)));
	const sentences = unit.sentences.with(s, edited.join(" "));
	return { source: unit.text, rewrite: joined(sentences), note: `"${core(word)}" removed` };
};

/** Delete a trailing time, place or amount phrase: "X at noon." becomes "X." */
export const dropQualifier: Edit = (unit, rng) => {
	const options = trailingPhrases(unit.sentences);
	if (options.length === 0) return null;
	const { s, at } = pick(rng, options);
	const words = splitWords(unit.sentences[s] as string);
	const phrase = words.slice(at).join(" ");
	return {
		source: unit.text,
		rewrite: joined(unit.sentences.with(s, endWith(words.slice(0, at)).join(" "))),
		note: `"${phrase.replace(/[.!?]+$/, "")}" removed`,
	};
};

/** Swap two sentences of a document whose order carries meaning. */
export const swapBeats: Edit = (unit, rng) => {
	if (!unit.ordered || unit.sentences.length < 2) return null;
	const first = Math.floor(rng() * unit.sentences.length);
	let second = Math.floor(rng() * (unit.sentences.length - 1));
	if (second >= first) second += 1;
	const sentences = [...unit.sentences];
	[sentences[first], sentences[second]] = [sentences[second] as string, sentences[first] as string];
	return {
		source: unit.text,
		rewrite: joined(sentences),
		note: `sentences ${Math.min(first, second) + 1} and ${Math.max(first, second) + 1} swapped`,
	};
};

/** Reorder every sentence of an ordered document; none stays in place. */
export const shuffleBeats: Edit = (unit, rng) => {
	if (!unit.ordered || unit.sentences.length < 3) return null;
	const order = [...unit.sentences.keys()];
	// Sattolo's algorithm yields a single cycle, so no sentence keeps its slot.
	for (let index = order.length - 1; index > 0; index -= 1) {
		const swap = Math.floor(rng() * index);
		[order[index], order[swap]] = [order[swap] as number, order[index] as number];
	}
	return {
		source: unit.text,
		rewrite: joined(order.map((index) => unit.sentences[index] as string)),
		note: `sentence order ${order.map((index) => index + 1).join(", ")}`,
	};
};

function insertPhrase(unit: Unit, rng: Rng, phrase: (taken: Set<string>) => string, label: string) {
	const index = Math.floor(rng() * unit.sentences.length);
	const taken = new Set(tokenNorms(unit.text));
	const inserted = phrase(taken);
	const sentences = unit.sentences.with(index, appendBeforeEnd(unit.sentences[index] as string, inserted));
	return { source: unit.text, rewrite: joined(sentences), note: `${label} "${inserted.trim()}" added` };
}

const unused = (rng: Rng, pool: readonly string[], taken: Set<string>) =>
	pick(
		rng,
		pool.filter((item) => !taken.has(item.toLowerCase())),
	);

export const insertName: Edit = (unit, rng) =>
	insertPhrase(
		unit,
		rng,
		(taken) => ` ${pick(rng, ["with", "for"])} ${unused(rng, NEW_NAMES, taken)}`,
		"name",
	);

export const insertPlace: Edit = (unit, rng) =>
	insertPhrase(
		unit,
		rng,
		(taken) => ` ${pick(rng, ["in", "at"])} ${unused(rng, NEW_PLACES, taken)}`,
		"place",
	);

export const insertNumber: Edit = (unit, rng) =>
	insertPhrase(
		unit,
		rng,
		(taken) => {
			let value = 0;
			do value = 13 + Math.floor(rng() * 80);
			while (taken.has(String(value)));
			const minutes = String(10 + Math.floor(rng() * 50));
			return pick(rng, [` for ${value} minutes`, ` at ${value % 12 || 12}:${minutes}`, ` ${value} times`]);
		},
		"number",
	);

/** Change one number by one digit, or swap one number word for another. */
export const replaceNumber: Edit = (unit, rng) => {
	const candidates: Array<[number, number]> = [];
	unit.sentences.forEach((sentence, s) => {
		splitWords(sentence).forEach((word, w) => {
			const value = core(word);
			if (/^\d+(?:[.,:]\d+)*$/.test(value) || NUMBER_WORD_SET.has(value.toLowerCase()))
				candidates.push([s, w]);
		});
	});
	if (candidates.length === 0) return null;
	const [s, w] = pick(rng, candidates);
	const words = splitWords(unit.sentences[s] as string);
	const original = core(words[w] as string);
	let replacement: string;
	if (/^\d/.test(original)) {
		const lastDigit = original.at(-1) as string;
		const options = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].filter((digit) => digit !== lastDigit);
		replacement = `${original.slice(0, -1)}${pick(rng, options)}`;
	} else {
		const options = NUMBER_WORDS.filter((value) => value !== original.toLowerCase());
		replacement = matchCase(original, pick(rng, options));
	}
	const sentences = unit.sentences.with(
		s,
		words.with(w, replaceCore(words[w] as string, replacement)).join(" "),
	);
	return { source: unit.text, rewrite: joined(sentences), note: `"${original}" became "${replacement}"` };
};

function properNounPositions(sentence: string, names: ReadonlySet<string>) {
	const found: Array<{ index: number; name: string }> = [];
	splitWords(sentence).forEach((word, index) => {
		const name = core(word).replace(/'s$/, "");
		if (names.has(name)) found.push({ index, name });
	});
	return found;
}

function renameWord(word: string, from: string, to: string) {
	return word.replace(from, to);
}

/** Replace one proper noun with a name that appears nowhere in the source. */
export const replaceName: Edit = (unit, rng, context) => {
	const candidates = unit.sentences.flatMap((sentence, s) =>
		properNounPositions(sentence, context.names).map((hit) => ({ ...hit, s })),
	);
	if (candidates.length === 0) return null;
	const target = pick(rng, candidates);
	const replacement = unused(rng, NEW_NAMES, new Set(tokenNorms(unit.text)));
	const words = splitWords(unit.sentences[target.s] as string);
	const edited = words.with(
		target.index,
		renameWord(words[target.index] as string, target.name, replacement),
	);
	return {
		source: unit.text,
		rewrite: joined(unit.sentences.with(target.s, edited.join(" "))),
		note: `"${target.name}" became "${replacement}"`,
	};
};

/** Swap two different, non-adjacent proper nouns inside one sentence: who did what to whom. */
export const swapRoles: Edit = (unit, rng, context) => {
	const options = unit.sentences.flatMap((sentence, s) => {
		const hits = properNounPositions(sentence, context.people);
		const pairs: Array<{ s: number; a: (typeof hits)[number]; b: (typeof hits)[number] }> = [];
		for (const a of hits) {
			for (const b of hits) {
				if (b.index - a.index >= 2 && a.name !== b.name) pairs.push({ s, a, b });
			}
		}
		return pairs;
	});
	if (options.length === 0) return null;
	const { s, a, b } = pick(rng, options);
	const words = splitWords(unit.sentences[s] as string);
	const edited = words
		.with(a.index, renameWord(words[a.index] as string, a.name, b.name))
		.with(b.index, renameWord(words[b.index] as string, b.name, a.name));
	if (a.index === 0) edited[0] = capitalize(edited[0] as string);
	return {
		source: unit.text,
		rewrite: joined(unit.sentences.with(s, edited.join(" "))),
		note: `"${a.name}" and "${b.name}" swapped`,
	};
};
