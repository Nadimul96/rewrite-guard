import type { Unit } from "../corpus/index.js";
import { pick, type Rng, shuffled } from "../rng.js";
import type { Perturbation, PerturbContext } from "./types.js";
import {
	capitalize,
	core,
	deleteWord,
	lowerCore,
	matchCase,
	parts,
	replaceCore,
	softenStart,
	splitWords,
	trailingPhrases,
} from "./words.js";

type Edit = (unit: Unit, rng: Rng, context: PerturbContext) => Perturbation | null;
type SentenceOp = (sentences: string[], rng: Rng, context: PerturbContext) => string[] | null;

const joined = (sentences: readonly string[]) => sentences.join(" ");

/** Change punctuation and casing only. */
export const punctuationCasing: Edit = (unit, rng) => {
	const ops: Array<[string, (text: string) => string]> = [
		["lowercased", (text) => text.toLowerCase()],
		["uppercased", (text) => text.toUpperCase()],
		["periods to exclamation marks", (text) => text.replace(/\.(?=\s|$)/g, "!")],
		["periods to semicolons", (text) => text.replace(/\.(?=\s+\S)/g, ";")],
		["commas removed", (text) => text.replace(/,(?!\d)/g, "")],
		["first comma to a dash", (text) => text.replace(/, /, " — ")],
	];
	const chosen = shuffled(rng, ops).slice(0, 1 + Math.floor(rng() * 2));
	const rewrite = chosen.reduce((text, [, op]) => op(text), unit.text);
	return { source: unit.text, rewrite, note: chosen.map(([label]) => label).join(", ") };
};

/**
 * The source is a spoken transcript with hesitations and discourse fillers;
 * the rewrite is the clean original text.
 */
export const fillerRemoval: Edit = (unit, rng, context) => {
	// Word arrays are built once and joined at the end, so a later insertion
	// can never land inside an earlier "you know".
	const sentences = unit.sentences.map((sentence) => splitWords(sentence));
	const openers = new Set<number>();
	const count = 1 + Math.floor(rng() * 3);
	const added: string[] = [];
	for (let step = 0; step < count; step += 1) {
		const index = Math.floor(rng() * sentences.length);
		const words = sentences[index] as string[];
		const position = 1 + Math.floor(rng() * Math.max(1, words.length - 2));
		const canInsertMiddle = words.length >= 3 && !/[,;:]$/.test(words[position - 1] as string);
		if ((rng() < 0.5 || !canInsertMiddle) && !openers.has(index)) {
			const opener = pick(rng, ["Um,", "Uh,", "So,", "Okay, so", "Well,", "Basically,"]);
			openers.add(index);
			const [first = "", ...rest] = words;
			sentences[index] = [opener, softenStart(first, context.properNouns), ...rest];
			added.push(opener.replace(/,$/, ""));
		} else if (canInsertMiddle) {
			const middle = pick(rng, ["uh", "um", "basically", "you know,"]);
			if (middle === "you know,") words[position - 1] = `${words[position - 1]},`;
			words.splice(position, 0, middle);
			added.push(middle.replace(/,$/, ""));
		}
	}
	if (added.length === 0) return null;
	return {
		source: joined(sentences.map((words) => words.join(" "))),
		rewrite: unit.text,
		note: `fillers in source: ${added.join(", ")}`,
	};
};

/** Move a trailing time or place phrase to the front: "X at noon." becomes "At noon, X." */
export const moveAdverbial: Edit = (unit, rng, context) => {
	const options = trailingPhrases(unit.sentences);
	if (options.length === 0) return null;
	const { s, at } = pick(rng, options);
	const words = splitWords(unit.sentences[s] as string);
	const phrase = words.slice(at);
	const rest = words.slice(0, at);
	const lastPhrase = phrase.length - 1;
	const { trail } = parts(phrase[lastPhrase] as string);
	phrase[lastPhrase] = `${core(phrase[lastPhrase] as string)},`;
	rest[rest.length - 1] = `${rest[rest.length - 1]}${trail}`;
	const moved = `${capitalize(phrase.join(" "))} ${softenStart(rest.join(" "), context.properNouns)}`;
	return {
		source: unit.text,
		rewrite: joined(unit.sentences.with(s, moved)),
		note: `"${phrase.join(" ").replace(/,$/, "")}" moved to the front`,
	};
};

const CONTRACT: Record<string, string> = {
	"did not": "didn't",
	"do not": "don't",
	"does not": "doesn't",
	"was not": "wasn't",
	"were not": "weren't",
	"is not": "isn't",
	"are not": "aren't",
	"could not": "couldn't",
	"would not": "wouldn't",
	"should not": "shouldn't",
	"will not": "won't",
	"has not": "hasn't",
	"have not": "haven't",
	"had not": "hadn't",
	"can not": "can't",
	"it is": "it's",
	"i am": "I'm",
};
const EXPAND = Object.fromEntries(
	Object.entries(CONTRACT).map(([long, short]) => [short.toLowerCase(), long]),
) as Record<string, string>;
EXPAND.cannot = "can not";

const toggleContraction: SentenceOp = (sentences, rng) => {
	const options: Array<() => string[]> = [];
	sentences.forEach((sentence, s) => {
		const words = splitWords(sentence);
		words.forEach((word, w) => {
			const expanded = EXPAND[lowerCore(word)];
			if (expanded) {
				options.push(() =>
					sentences.with(s, words.with(w, replaceCore(word, matchCase(core(word), expanded))).join(" ")),
				);
			}
			const pair = `${lowerCore(word)} ${lowerCore(words[w + 1] ?? "")}`;
			const contracted = CONTRACT[pair];
			if (contracted && !parts(word).trail) {
				options.push(() => {
					const merged = [...words];
					merged.splice(w, 2, replaceCore(words[w + 1] as string, matchCase(core(word), contracted)));
					return sentences.with(s, merged.join(" "));
				});
			}
		});
	});
	return options.length > 0 ? pick(rng, options)() : null;
};

const DIGIT_WORDS = [
	"zero",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
	"ten",
	"eleven",
	"twelve",
];

const toggleNumberFormat: SentenceOp = (sentences, rng) => {
	const options: Array<() => string[]> = [];
	sentences.forEach((sentence, s) => {
		const words = splitWords(sentence);
		words.forEach((word, w) => {
			const value = core(word);
			const asWord = DIGIT_WORDS.indexOf(value.toLowerCase());
			if (asWord >= 0) {
				options.push(() => sentences.with(s, words.with(w, replaceCore(word, String(asWord))).join(" ")));
			} else if (/^\d+$/.test(value) && Number(value) <= 12 && w > 0) {
				const spelled = DIGIT_WORDS[Number(value)] as string;
				options.push(() => sentences.with(s, words.with(w, replaceCore(word, spelled)).join(" ")));
			}
		});
	});
	return options.length > 0 ? pick(rng, options)() : null;
};

const mergeSentences: SentenceOp = (sentences, rng, context) => {
	if (sentences.length < 2) return null;
	const index = Math.floor(rng() * (sentences.length - 1));
	const first = (sentences[index] as string).replace(/[.!?]+$/, "");
	const merged = `${first}, and ${softenStart(sentences[index + 1] as string, context.properNouns)}`;
	return [...sentences.slice(0, index), merged, ...sentences.slice(index + 2)];
};

const swapArticle: SentenceOp = (sentences, rng) => {
	const options: Array<() => string[]> = [];
	sentences.forEach((sentence, s) => {
		const words = splitWords(sentence);
		words.forEach((word, w) => {
			const lower = lowerCore(word);
			const next = words[w + 1];
			if (!next || parts(word).trail) return;
			if (lower === "the") {
				const article = /^[aeiou]/i.test(core(next)) ? "an" : "a";
				options.push(() =>
					sentences.with(s, words.with(w, replaceCore(word, matchCase(core(word), article))).join(" ")),
				);
			} else if (lower === "a" || lower === "an") {
				options.push(() =>
					sentences.with(s, words.with(w, replaceCore(word, matchCase(core(word), "the"))).join(" ")),
				);
			}
		});
	});
	return options.length > 0 ? pick(rng, options)() : null;
};

const DROPPABLE = new Set(["then", "just", "really", "very", "also", "quite"]);
// "that" is only a droppable complementizer after a verb, not after these.
const NOT_BEFORE_COMPLEMENT = new Set([
	"after",
	"before",
	"of",
	"with",
	"for",
	"like",
	"about",
	"than",
	"at",
	"on",
	"in",
	"by",
	"from",
	"to",
	"since",
	"until",
	"and",
	"but",
]);
const COMPLEMENT_FOLLOWERS = new Set([
	"i",
	"he",
	"she",
	"they",
	"we",
	"it",
	"the",
	"his",
	"her",
	"their",
	"my",
	"whoever",
]);

const dropModifier: SentenceOp = (sentences, rng) => {
	const options: Array<() => string[]> = [];
	sentences.forEach((sentence, s) => {
		const words = splitWords(sentence);
		words.forEach((word, w) => {
			const lower = lowerCore(word);
			const droppable =
				DROPPABLE.has(lower) ||
				(lower === "that" &&
					w > 0 &&
					!NOT_BEFORE_COMPLEMENT.has(lowerCore(words[w - 1] as string)) &&
					COMPLEMENT_FOLLOWERS.has(lowerCore(words[w + 1] ?? "")));
			if (droppable && words.length > 3) {
				options.push(() => sentences.with(s, deleteWord(words, w).join(" ")));
			}
		});
	});
	return options.length > 0 ? pick(rng, options)() : null;
};

const addThen: SentenceOp = (sentences, rng, context) => {
	const options = sentences
		.map((sentence, index) => ({ sentence, index }))
		.filter(({ sentence, index }) => index > 0 && !/^(then|when|after|before)\b/i.test(sentence));
	if (options.length === 0) return null;
	const { sentence, index } = pick(rng, options);
	return sentences.with(index, `Then ${softenStart(sentence, context.properNouns)}`);
};

const LIGHT_OPS: Array<[string, SentenceOp, (unit: Unit) => boolean]> = [
	["contraction toggled", toggleContraction, () => true],
	["number format toggled", toggleNumberFormat, () => true],
	["sentences merged", mergeSentences, (unit) => unit.sentences.length >= 2],
	["article swapped", swapArticle, () => true],
	["modifier dropped", dropModifier, () => true],
	['"then" added', addThen, (unit) => unit.ordered],
];

/** Two small edits an LLM cleanup typically makes without changing a fact. */
export const lightParaphrase: Edit = (unit, rng, context) => {
	let sentences = [...unit.sentences];
	const applied: string[] = [];
	for (const [label, op, applies] of shuffled(rng, LIGHT_OPS)) {
		if (applied.length === 2) break;
		if (!applies(unit)) continue;
		const next = op(sentences, rng, context);
		if (!next) continue;
		sentences = next;
		applied.push(label);
	}
	if (applied.length === 0) return null;
	return {
		source: unit.text,
		rewrite: joined(sentences).replace(/^\p{Ll}/u, (c) => c.toUpperCase()),
		note: applied.join(", "),
	};
};

/** A hand-written paraphrase from the corpus, when one exists for this unit. */
export const heavyParaphrase: Edit = (unit, _rng, context) => {
	const rewrite = context.paraphrases[unit.id];
	return rewrite ? { source: unit.text, rewrite, note: "hand-written paraphrase" } : null;
};
