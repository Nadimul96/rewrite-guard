import { type LcsOptions, lcsAlignment } from "./lcs.js";
import { english, type Locale } from "./locale.js";
import { tokenize } from "./tokenize.js";

export interface AnchorOptions extends LcsOptions {
	/** Share of a segment's tokens that must align for the anchor to count. */
	readonly minMatchRatio?: number;
	readonly locale?: Locale;
}

export interface SegmentAnchor {
	/** Index of the segment in the input array. */
	readonly segment: number;
	/** Share of the segment's tokens matched in source order. */
	readonly matchRatio: number;
	/** Source span the segment covers, or null when the match is too weak. */
	readonly source: {
		/** Token range `[startToken, endToken)`. */
		readonly startToken: number;
		readonly endToken: number;
		/** Character range `[start, end)` in the source text. */
		readonly start: number;
		readonly end: number;
	} | null;
}

/**
 * Attach each rewrite segment (a caption, bullet or paragraph) to the source
 * span it covers.
 *
 * All segments are aligned against the source in one LCS pass, so the
 * anchors are monotonic by construction and a common word in an early
 * segment cannot drag the cursor past text a later segment needs. This
 * replaces a greedy "first forward hit" matcher that did exactly that, with
 * an O(n·m) scan per word.
 */
export function anchorSegments(
	source: string,
	segments: readonly string[],
	options: AnchorOptions = {},
): SegmentAnchor[] {
	const locale = options.locale ?? english;
	const minMatchRatio = options.minMatchRatio ?? 0.75;
	const sourceTokens = tokenize(source, locale);
	const segmentOf: number[] = [];
	const rewriteNorms: string[] = [];
	const segmentSizes = segments.map((segment, index) => {
		const tokens = tokenize(segment, locale);
		for (const token of tokens) {
			rewriteNorms.push(token.norm);
			segmentOf.push(index);
		}
		return tokens.length;
	});

	const matched = segments.map(() => [] as number[]);
	const alignment = lcsAlignment(
		sourceTokens.map((token) => token.norm),
		rewriteNorms,
		options,
	);
	for (const [sourceIndex, rewriteIndex] of alignment) {
		matched[segmentOf[rewriteIndex] as number]?.push(sourceIndex);
	}

	return segments.map((_, index) => {
		const hits = matched[index] ?? [];
		const size = segmentSizes[index] ?? 0;
		const matchRatio = size === 0 ? 0 : hits.length / size;
		const first = hits[0];
		const last = hits.at(-1);
		if (matchRatio < minMatchRatio || first === undefined || last === undefined) {
			return { segment: index, matchRatio, source: null };
		}
		const startToken = sourceTokens[first];
		const endToken = sourceTokens[last];
		return {
			segment: index,
			matchRatio,
			source: {
				startToken: first,
				endToken: last + 1,
				start: startToken?.start ?? 0,
				end: endToken?.end ?? 0,
			},
		};
	});
}
