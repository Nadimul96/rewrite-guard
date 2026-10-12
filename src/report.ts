import type { Alignment } from "./lcs.js";
import type { ThresholdProfile } from "./profiles.js";
import type { Span } from "./runs.js";
import type { Token } from "./tokenize.js";

export type FailureCode =
	| "ordered_coverage"
	| "lexical_coverage"
	| "order_retention"
	| "payoff"
	| "dropped_span"
	| "moved_span"
	| "novel_tokens"
	| "negation"
	| "number"
	| "unexpected_content";

export interface Failure {
	readonly code: FailureCode;
	/** One plain-English sentence naming the words or numbers involved. */
	readonly message: string;
}

/** A token plus the surface text it came from. */
export interface TokenRef extends Token {
	readonly text: string;
}

export interface MovedToken {
	readonly source: TokenRef;
	readonly rewrite: TokenRef;
}

export interface FidelityMetrics {
	/** Source tokens kept in source order (LCS / source tokens). */
	readonly orderedCoverage: number;
	/** Source tokens present anywhere (multiset overlap / source tokens). */
	readonly lexicalCoverage: number;
	/** Present tokens that are also in order (LCS / overlap). */
	readonly orderRetention: number;
	/** Content words of the final span kept in order. */
	readonly payoffCoverage: number;
	/** Longest block of source tokens missing from the rewrite (see `longestSpan`). */
	readonly longestMissingRun: number;
	/** Longest block of source tokens present but out of order (see `longestSpan`). */
	readonly longestMovedRun: number;
}

export interface FidelityReport {
	readonly passes: boolean;
	readonly failures: readonly Failure[];
	readonly profile: ThresholdProfile;
	readonly counts: {
		readonly sourceTokens: number;
		readonly rewriteTokens: number;
		readonly matchedInOrder: number;
		readonly matchedLexically: number;
	};
	readonly metrics: FidelityMetrics;
	/** Source tokens absent from the rewrite. */
	readonly missing: readonly TokenRef[];
	/** Rewrite tokens with no support in the source or the allowed evidence. */
	readonly novel: readonly TokenRef[];
	/** Tokens present in both texts but outside the in-order alignment. */
	readonly moved: readonly MovedToken[];
	readonly negations: { readonly dropped: readonly TokenRef[]; readonly added: readonly TokenRef[] };
	/** Source numbers absent from the rewrite. */
	readonly numbers: { readonly dropped: readonly TokenRef[] };
	/** Source token ranges of the longest dropped and moved blocks. */
	readonly spans: { readonly missing: Span | null; readonly moved: Span | null };
	readonly payoff: {
		/** Source token range `[start, end)` treated as the payoff. */
		readonly range: readonly [number, number];
		/** Content words in that range that did not survive in order. */
		readonly missing: readonly TokenRef[];
	};
	/** In-order matches as `[sourceIndex, rewriteIndex]` token pairs. */
	readonly alignment: Alignment;
	readonly sourceTokens: readonly TokenRef[];
	readonly rewriteTokens: readonly TokenRef[];
}
