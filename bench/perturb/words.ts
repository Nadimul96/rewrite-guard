/** Small word-level text editing helpers shared by the perturbations. */

export const splitWords = (text: string) => text.split(/\s+/).filter(Boolean);

const EDGES = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u;

/** Split a surface word into leading punctuation, core and trailing punctuation. */
export function parts(word: string): { lead: string; core: string; trail: string } {
	const match = EDGES.exec(word);
	return { lead: match?.[1] ?? "", core: match?.[2] ?? word, trail: match?.[3] ?? "" };
}

export const core = (word: string) => parts(word).core;
export const lowerCore = (word: string) => core(word).toLowerCase().replace(/’/g, "'");

export function replaceCore(word: string, replacement: string): string {
	const { lead, trail } = parts(word);
	return `${lead}${replacement}${trail}`;
}

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export const decapitalize = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** Give `replacement` the leading capital of `original`, if it had one. */
export function matchCase(original: string, replacement: string): string {
	return /^\p{Lu}/u.test(original) ? capitalize(replacement) : replacement;
}

/** Lowercase a sentence-initial word unless it is "I" or a known proper noun. */
export function softenStart(sentence: string, properNouns: ReadonlySet<string>): string {
	const [first = "", ...rest] = splitWords(sentence);
	const name = core(first).replace(/'s$/, "");
	if (name === "I" || properNouns.has(name) || /^\p{Lu}{2,}/u.test(name)) return sentence;
	return [decapitalize(first), ...rest].join(" ");
}

/**
 * Delete the word at `index`, keeping the sentence well formed: trailing
 * punctuation moves to the previous word and a deleted first word passes
 * its capital to the next one.
 */
export function deleteWord(words: readonly string[], index: number): string[] {
	const out = [...words];
	const [removed = ""] = out.splice(index, 1);
	const { trail } = parts(removed);
	if (trail && index > 0) out[index - 1] = `${out[index - 1]}${trail}`;
	if (index === 0 && out[0] && /^\p{Lu}/u.test(removed)) out[0] = capitalize(out[0]);
	return out;
}

/** Insert `phrase` just before the sentence's final punctuation. */
export function appendBeforeEnd(sentence: string, phrase: string): string {
	const match = /^(.*?)([.!?]*)$/su.exec(sentence.trimEnd());
	return `${match?.[1] ?? sentence}${phrase}${match?.[2] ?? ""}`;
}

export function endsSentence(word: string): boolean {
	return /[.!?]["')\]]*$/.test(word);
}

const PREPOSITIONS = new Set([
	"on",
	"at",
	"in",
	"after",
	"before",
	"during",
	"by",
	"since",
	"until",
	"from",
	"inside",
]);

/**
 * Sentences that end in a short prepositional phrase ("at noon.", "for 7
 * days."), as `{ s, at }`: sentence index and the word index where the
 * phrase starts. The phrase is two to five words and the rest of the
 * sentence keeps at least four.
 */
export function trailingPhrases(sentences: readonly string[]): Array<{ s: number; at: number }> {
	const found: Array<{ s: number; at: number }> = [];
	sentences.forEach((sentence, s) => {
		const words = splitWords(sentence);
		const last = words.length - 1;
		if (!endsSentence(words[last] ?? "")) return;
		for (let at = last - 1; at >= Math.max(4, words.length - 5); at -= 1) {
			if (words.slice(at, last).some((word) => /[,;:]$/.test(word))) break;
			if (PREPOSITIONS.has(lowerCore(words[at] as string))) {
				found.push({ s, at });
				break;
			}
		}
	});
	return found;
}
