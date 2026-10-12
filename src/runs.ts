export interface Span {
	/** First token index of the block. */
	readonly start: number;
	/** Token index just past the block; `end - start` is its length. */
	readonly end: number;
}

/**
 * The longest block of source tokens that share a status (missing, or moved
 * out of order), measured on content words; null when there is none.
 *
 * A block starts and ends on content words with the status. Function words
 * inside it count toward its length whatever their own status, and function
 * words with the status at its edges extend it. Two consequences:
 *
 * - A moved sentence stays one block even when the LCS borrows its "the" to
 *   align with a different sentence, which would otherwise split the run.
 * - Dropping or swapping only function words ("the" for "a") never forms a
 *   block, so light edits do not look like dropped spans.
 */
export function longestSpan(status: Uint8Array, glue: Uint8Array): Span | null {
	const n = status.length;
	const isContentHit = (index: number) => !glue[index] && status[index] === 1;
	const isEdgeGlue = (index: number) => glue[index] === 1 && status[index] === 1;
	let longest: Span | null = null;
	let index = 0;
	while (index < n) {
		if (!isContentHit(index)) {
			index += 1;
			continue;
		}
		let start = index;
		while (start > 0 && isEdgeGlue(start - 1)) start -= 1;
		let lastContent = index;
		let cursor = index + 1;
		while (cursor < n && (glue[cursor] === 1 || status[cursor] === 1)) {
			if (isContentHit(cursor)) lastContent = cursor;
			cursor += 1;
		}
		let end = lastContent;
		while (end + 1 < n && isEdgeGlue(end + 1)) end += 1;
		if (!longest || end + 1 - start > longest.end - longest.start) longest = { start, end: end + 1 };
		index = cursor;
	}
	return longest;
}
