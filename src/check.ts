import { decide } from "./decide.js";
import { type LcsOptions, lcsAlignment } from "./lcs.js";
import { english, type Locale } from "./locale.js";
import {
	type ProfileName,
	payoffLength,
	profileByName,
	profileFor,
	type ThresholdProfile,
	type Thresholds,
} from "./profiles.js";
import type { FidelityReport, MovedToken, TokenRef } from "./report.js";
import { longestSpan } from "./runs.js";
import { type Token, tokenize } from "./tokenize.js";

export type {
	Failure,
	FailureCode,
	FidelityMetrics,
	FidelityReport,
	MovedToken,
	TokenRef,
} from "./report.js";

export interface FidelityOptions extends LcsOptions {
	/** Profile table to choose from; defaults to the calibrated `PROFILES`. */
	readonly profiles?: readonly ThresholdProfile[];
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

const NUMBER = /^\p{N}/u;

/**
 * Compare a rewrite against its source and decide whether it kept the facts.
 *
 * Three independent checks feed one decision: coverage (what survived, and in
 * what order), novelty (what appeared from nowhere) and protected content
 * (negations, numbers and the payoff). Every number in the report traces
 * back to specific token positions.
 */
export function checkFidelity(
	source: string,
	rewrite: string,
	options: FidelityOptions = {},
): FidelityReport {
	const locale = options.locale ?? english;
	const sourceTokens = withText(source, tokenize(source, locale));
	const rewriteTokens = withText(rewrite, tokenize(rewrite, locale));
	const base = options.profile
		? profileByName(options.profile, options.profiles)
		: profileFor(sourceTokens.length, options.profiles);
	const profile: ThresholdProfile = { ...base, ...options.thresholds };

	// Coverage: one LCS alignment, then out-of-order matches among the rest.
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
	const sourceGlue = Uint8Array.from(sourceTokens, (token) => (locale.glueWords.has(token.norm) ? 1 : 0));
	const extra = rewriteTokens.filter((token) => !rewriteAligned[token.index] && !rewriteMoved[token.index]);

	// Novelty: extra words the source and the evidence cannot account for.
	const supported = supportedVocabulary(sourceTokens, options.allowedEvidence ?? [], locale);
	const novel = extra.filter((token) => !supported.has(token.norm));

	// Protected content: polarity, numbers and the ending.
	const negations = {
		dropped: missing.filter((token) => locale.negations.has(token.norm)),
		added: extra.filter((token) => locale.negations.has(token.norm)),
	};
	const numbers = { dropped: missing.filter((token) => NUMBER.test(token.norm)) };
	const payoffStart = sourceTokens.length - payoffLength(sourceTokens.length);
	const payoffSpan = sourceTokens.slice(payoffStart);
	const payoffContent = payoffSpan.some((token) => !locale.glueWords.has(token.norm))
		? payoffSpan.filter((token) => !locale.glueWords.has(token.norm))
		: payoffSpan;
	const payoffMissing = payoffContent.filter((token) => !sourceAligned[token.index]);

	const sourceCount = sourceTokens.length;
	const matchedInOrder = alignment.length;
	const matchedLexically = matchedInOrder + moved.length;
	const metrics = {
		orderedCoverage: ratio(matchedInOrder, sourceCount),
		lexicalCoverage: ratio(matchedLexically, sourceCount),
		orderRetention: ratio(matchedInOrder, matchedLexically),
		payoffCoverage: ratio(payoffContent.length - payoffMissing.length, payoffContent.length),
		longestMissingRun: longestSpan(missingFlags, sourceGlue),
		longestMovedRun: longestSpan(sourceMoved, sourceGlue),
	};

	const failures = decide({
		profile,
		metrics,
		sourceCount,
		rewriteCount: rewriteTokens.length,
		novel,
		negations,
		numbers,
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
		numbers,
		payoff: { range: [payoffStart, sourceCount], missing: payoffMissing },
		alignment,
		sourceTokens,
		rewriteTokens,
	};
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

function ratio(numerator: number, denominator: number) {
	return denominator === 0 ? 1 : numerator / denominator;
}
