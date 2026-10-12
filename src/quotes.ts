/**
 * Verbatim checks: a quote an LLM attributes to the source must appear in it,
 * and a document split into parts must be an exact, gap-free partition.
 * Comparison is word by word, ignoring whitespace, case and punctuation at
 * word edges, so "Hello," matches "hello" but "helo" does not.
 */

export interface QuoteMatch {
	/** The matched source text, exactly as written in the source. */
	readonly text: string;
	/** Character range `[start, end)` in the source. */
	readonly start: number;
	readonly end: number;
	/** Whitespace-delimited word range `[startWord, endWord)` in the source. */
	readonly startWord: number;
	readonly endWord: number;
}

export type PartitionResult =
	| { readonly ok: true }
	| {
			readonly ok: false;
			/** Index of the first part that breaks the partition. */
			readonly part: number;
			/** Source word index where the mismatch starts. */
			readonly word: number;
			readonly reason: "empty_part" | "mismatch" | "extra_text" | "incomplete";
			readonly message: string;
	  };

interface Word {
	readonly start: number;
	readonly end: number;
	readonly key: string;
}

/** Find the first verbatim occurrence of `quote` in `source`, or null. */
export function findQuote(
	source: string,
	quote: string,
	range: { readonly fromWord?: number; readonly toWord?: number } = {},
): QuoteMatch | null {
	const sourceWords = splitWords(source);
	const quoteWords = splitWords(quote);
	if (quoteWords.length === 0) return null;
	const from = Math.max(0, range.fromWord ?? 0);
	const to = Math.min(sourceWords.length, range.toWord ?? sourceWords.length);
	for (let index = from; index + quoteWords.length <= to; index += 1) {
		const matches = quoteWords.every((word, offset) => sourceWords[index + offset]?.key === word.key);
		if (!matches) continue;
		const first = sourceWords[index] as Word;
		const last = sourceWords[index + quoteWords.length - 1] as Word;
		return {
			text: source.slice(first.start, last.end),
			start: first.start,
			end: last.end,
			startWord: index,
			endWord: index + quoteWords.length,
		};
	}
	return null;
}

/**
 * Check that `parts`, in order, cover every word of `source` exactly once
 * with no edits. Useful when a model is asked to split a document into
 * sections and must not touch the text.
 */
export function checkPartition(source: string, parts: readonly string[]): PartitionResult {
	const sourceWords = splitWords(source);
	let cursor = 0;
	for (const [partIndex, part] of parts.entries()) {
		const partWords = splitWords(part);
		if (partWords.length === 0) {
			return partitionFailure(partIndex, cursor, "empty_part", `Part ${partIndex} is empty.`);
		}
		for (const word of partWords) {
			const expected = sourceWords[cursor];
			if (!expected) {
				return partitionFailure(
					partIndex,
					cursor,
					"extra_text",
					`Part ${partIndex} continues past the end of the source.`,
				);
			}
			if (expected.key !== word.key) {
				return partitionFailure(
					partIndex,
					cursor,
					"mismatch",
					`Part ${partIndex} has "${part.slice(word.start, word.end)}" where the source has "${source.slice(expected.start, expected.end)}".`,
				);
			}
			cursor += 1;
		}
	}
	if (cursor < sourceWords.length) {
		return partitionFailure(
			Math.max(0, parts.length - 1),
			cursor,
			"incomplete",
			`The parts stop after ${cursor} of ${sourceWords.length} source words.`,
		);
	}
	return { ok: true };
}

function splitWords(text: string): Word[] {
	const words: Word[] = [];
	for (const match of text.matchAll(/\S+/g)) {
		const key = match[0]
			.normalize("NFKC")
			.replace(/’/g, "'")
			.toLocaleLowerCase("en-US")
			.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
		if (!key) continue;
		words.push({ start: match.index, end: match.index + match[0].length, key });
	}
	return words;
}

function partitionFailure(
	part: number,
	word: number,
	reason: "empty_part" | "mismatch" | "extra_text" | "incomplete",
	message: string,
): PartitionResult {
	return { ok: false, part, word, reason, message };
}
