import { type Alignment, type LcsOptions, lcsAlignment } from "./lcs.js";
import { english, type Locale } from "./locale.js";
import {
	type ProfileName,
	payoffLength,
	profileByName,
	profileFor,
	type ThresholdProfile,
	type Thresholds,
} from "./profiles.js";
import { type Token, tokenize } from "./tokenize.js";

export interface FidelityOptions extends LcsOptions {
	/** Force a profile instead of choosing one by source length. */
	readonly profile?: ProfileName;
	/** Override individual thresholds of the chosen profile. */
	readonly thresholds?: Partial<Thresholds>;
	/**
	 * Extra text whose words the rewrite may use, such as facts a person
	 * confirmed after the source was written.
	 */
	readonly allowedEvidence?: readonly string[];
	/** Enforce the payoff threshold. Defaults to true. */
	readonly requirePayoff?: boolean;
	readonly locale?: Locale;
}

export type FailureCode =
	| "ordered_coverage"
	| "lexical_coverage"
	| "order_retention"
	| "payoff"
	| "dropped_span"
	| "moved_span"
	| "novel_tokens"
	| "negation"
	| "unexpected_content";

export interface Failure {
	readonly code: FailureCode;
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
	readonly metrics: {
		readonly orderedCoverage: number;
		readonly lexicalCoverage: number;
		readonly orderRetention: number;
		readonly payoffCoverage: number;
		readonly longestMissingRun: number;
		readonly longestMovedRun: number;
	};
	/** Source tokens absent from the rewrite. */
	readonly missing: readonly TokenRef[];
	/** Rewrite tokens with no support in the source or the allowed evidence. */
	readonly novel: readonly TokenRef[];
	/** Tokens present in both texts but outside the in-order alignment. */
	readonly moved: readonly MovedToken[];
	readonly negations: { readonly dropped: readonly TokenRef[]; readonly added: readonly TokenRef[] };
	readonly payoff: {
		/** Source token range `[start, end)` treated as the payoff. */
		readonly range: readonly [number, number];
		readonly missing: readonly TokenRef[];
	};
	/** In-order matches as `[sourceIndex, rewriteIndex]` token pairs. */
	readonly alignment: Alignment;
	readonly sourceTokens: readonly TokenRef[];
	readonly rewriteTokens: readonly TokenRef[];
}

/**
 * Compare a rewrite against its source and decide whether it kept the facts.
 *
 * Three independent checks feed one decision: coverage (what survived, and in
 * what order), novelty (what appeared from nowhere) and protected content
 * (negations and the payoff). Every number in the report traces back to
 * specific token positions.
 */
export function checkFidelity(
	source: string,
	rewrite: string,
	options: FidelityOptions = {},
): FidelityReport {
	const locale = options.locale ?? english;
	const sourceTokens = withText(source, tokenize(source, locale));
	const rewriteTokens = withText(rewrite, tokenize(rewrite, locale));
	const base = options.profile ? profileByName(options.profile) : profileFor(sourceTokens.length);
	const profile: ThresholdProfile = { ...base, ...options.thresholds };

	const alignment = lcsAlignment(
		sourceTokens.map((token) => token.norm),
		rewriteTokens.map((token) => token.norm),
		options,
	);
	const sourceAligned = new Uint8Array(sourceTokens.length);
	const rewriteAligned = new Uint8Array(rewriteTokens.length);
	for (const [i, j] of alignment) {
		sourceAligned[i] = 1;
		rewriteAligned[j] = 1;
	}

	const { moved, sourceMoved, rewriteMoved } = matchOutOfOrder(
		sourceTokens,
		rewriteTokens,
		sourceAligned,
		rewriteAligned,
	);
	const missingFlags = Uint8Array.from(sourceTokens, (token) =>
		sourceAligned[token.index] || sourceMoved[token.index] ? 0 : 1,
	);
	const missing = sourceTokens.filter((token) => missingFlags[token.index]);
	const extra = rewriteTokens.filter((token) => !rewriteAligned[token.index] && !rewriteMoved[token.index]);
	const supported = supportedVocabulary(sourceTokens, options.allowedEvidence ?? [], locale);
	const novel = extra.filter((token) => !supported.has(token.norm));
	const negations = {
		dropped: missing.filter((token) => locale.negations.has(token.norm)),
		added: extra.filter((token) => locale.negations.has(token.norm)),
	};

	const [payoffStart, payoffEnd] = [
		sourceTokens.length - payoffLength(sourceTokens.length),
		sourceTokens.length,
	];
	const payoffMissing = sourceTokens.slice(payoffStart).filter((token) => !sourceAligned[token.index]);

	const sourceCount = sourceTokens.length;
	const matchedInOrder = alignment.length;
	const matchedLexically = matchedInOrder + moved.length;
	const metrics = {
		orderedCoverage: ratio(matchedInOrder, sourceCount),
		lexicalCoverage: ratio(matchedLexically, sourceCount),
		orderRetention: ratio(matchedInOrder, matchedLexically),
		payoffCoverage: ratio(payoffEnd - payoffStart - payoffMissing.length, payoffEnd - payoffStart),
		longestMissingRun: longestRun(missingFlags),
		longestMovedRun: longestRun(sourceMoved),
	};

	const failures = decide({
		profile,
		metrics,
		sourceCount,
		rewriteCount: rewriteTokens.length,
		novel,
		negations,
		requirePayoff: options.requirePayoff ?? true,
	});

	return {
		passes: failures.length === 0,
		failures,
		profile,
		counts: {
			sourceTokens: sourceCount,
			rewriteTokens: rewriteTokens.length,
			matchedInOrder,
			matchedLexically,
		},
		metrics,
		missing,
		novel,
		moved,
		negations,
		payoff: { range: [payoffStart, payoffEnd], missing: payoffMissing },
		alignment,
		sourceTokens,
		rewriteTokens,
	};
}

interface DecisionInput {
	profile: ThresholdProfile;
	metrics: FidelityReport["metrics"];
	sourceCount: number;
	rewriteCount: number;
	novel: readonly TokenRef[];
	negations: FidelityReport["negations"];
	requirePayoff: boolean;
}

function decide(input: DecisionInput): Failure[] {
	const { profile, metrics, novel, negations } = input;
	const failures: Failure[] = [];
	const fail = (code: FailureCode, message: string) => failures.push({ code, message });

	if (input.sourceCount === 0) {
		if (input.rewriteCount > 0) {
			fail("unexpected_content", "The source has no comparable words, but the rewrite does.");
		}
		return failures;
	}

	if (metrics.orderedCoverage < profile.ordered) {
		fail(
			"ordered_coverage",
			`${percent(metrics.orderedCoverage)} of source words survive in order; the ${profile.name} profile needs ${percent(profile.ordered)}.`,
		);
	}
	if (metrics.lexicalCoverage < profile.lexical) {
		fail(
			"lexical_coverage",
			`${percent(metrics.lexicalCoverage)} of source words appear at all; the ${profile.name} profile needs ${percent(profile.lexical)}.`,
		);
	}
	if (metrics.orderRetention < profile.orderRetention) {
		fail(
			"order_retention",
			`Only ${percent(metrics.orderRetention)} of the kept words stay in source order; the ${profile.name} profile needs ${percent(profile.orderRetention)}.`,
		);
	}
	if (input.requirePayoff && metrics.payoffCoverage < profile.payoff) {
		fail(
			"payoff",
			`${percent(metrics.payoffCoverage)} of the ending survives in order; the ${profile.name} profile needs ${percent(profile.payoff)}.`,
		);
	}
	if (metrics.longestMissingRun > profile.maxMissingRun) {
		fail(
			"dropped_span",
			`${runOf(metrics.longestMissingRun)} missing; the limit is ${profile.maxMissingRun}.`,
		);
	}
	if (metrics.longestMovedRun > profile.maxMovedRun) {
		fail(
			"moved_span",
			`${runOf(metrics.longestMovedRun)} out of source order; the limit is ${profile.maxMovedRun}.`,
		);
	}
	if (novel.length > 0) {
		fail("novel_tokens", `The rewrite adds unsupported words: ${quoteList(novel)}.`);
	}
	if (negations.dropped.length > 0 || negations.added.length > 0) {
		const parts = [
			negations.dropped.length > 0 ? `drops ${quoteList(negations.dropped)}` : "",
			negations.added.length > 0 ? `adds ${quoteList(negations.added)}` : "",
		].filter(Boolean);
		fail("negation", `The rewrite ${parts.join(" and ")}, which flips a claim.`);
	}
	return failures;
}

/**
 * Pair unaligned tokens that share a normalized form. Those words survived
 * the rewrite, just not in source order. Pairing is first-come in source
 * order, which keeps the result deterministic.
 */
function matchOutOfOrder(
	sourceTokens: readonly TokenRef[],
	rewriteTokens: readonly TokenRef[],
	sourceAligned: Uint8Array,
	rewriteAligned: Uint8Array,
) {
	const waiting = new Map<string, TokenRef[]>();
	for (const token of sourceTokens) {
		if (sourceAligned[token.index]) continue;
		const queue = waiting.get(token.norm);
		if (queue) queue.push(token);
		else waiting.set(token.norm, [token]);
	}
	const moved: MovedToken[] = [];
	const sourceMoved = new Uint8Array(sourceTokens.length);
	const rewriteMoved = new Uint8Array(rewriteTokens.length);
	for (const token of rewriteTokens) {
		if (rewriteAligned[token.index]) continue;
		const match = waiting.get(token.norm)?.shift();
		if (!match) continue;
		moved.push({ source: match, rewrite: token });
		sourceMoved[match.index] = 1;
		rewriteMoved[token.index] = 1;
	}
	moved.sort((left, right) => left.source.index - right.source.index);
	return { moved, sourceMoved, rewriteMoved };
}

function supportedVocabulary(
	sourceTokens: readonly TokenRef[],
	evidence: readonly string[],
	locale: Locale,
): Set<string> {
	const supported = new Set<string>(locale.glueWords);
	for (const token of sourceTokens) supported.add(token.norm);
	for (const text of evidence) {
		for (const token of tokenize(text, locale)) supported.add(token.norm);
	}
	for (const group of locale.equivalentWords) {
		if (group.some((word) => supported.has(word))) {
			for (const word of group) supported.add(word);
		}
	}
	return supported;
}

function withText(text: string, tokens: readonly Token[]): TokenRef[] {
	return tokens.map((token) => ({ ...token, text: text.slice(token.start, token.end) }));
}

function longestRun(flags: Uint8Array): number {
	let longest = 0;
	let current = 0;
	for (const flag of flags) {
		current = flag ? current + 1 : 0;
		if (current > longest) longest = current;
	}
	return longest;
}

function ratio(numerator: number, denominator: number) {
	return denominator === 0 ? 1 : numerator / denominator;
}

// Rounds down so a value just under its threshold never displays as equal to it.
function percent(value: number) {
	return `${Math.floor(value * 1000 + 1e-9) / 10}%`;
}

function runOf(count: number) {
	return count === 1 ? "1 source word is" : `${count} consecutive source words are`;
}

function quoteList(tokens: readonly TokenRef[]) {
	const unique = [...new Set(tokens.map((token) => token.text))];
	const shown = unique.slice(0, 6).map((text) => `"${text}"`);
	return unique.length > 6 ? `${shown.join(", ")} and ${unique.length - 6} more` : shown.join(", ");
}
