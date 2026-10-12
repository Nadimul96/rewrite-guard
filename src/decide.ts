import type { ThresholdProfile } from "./profiles.js";
import type { Failure, FailureCode, FidelityReport, TokenRef } from "./report.js";

export interface DecisionInput {
	readonly profile: ThresholdProfile;
	readonly metrics: FidelityReport["metrics"];
	readonly sourceCount: number;
	readonly rewriteCount: number;
	readonly novel: readonly TokenRef[];
	readonly negations: FidelityReport["negations"];
	readonly numbers: FidelityReport["numbers"];
	/** First and last words of the longest dropped and moved blocks. */
	readonly spans: { readonly missing: string; readonly moved: string };
	readonly requirePayoff: boolean;
}

/**
 * Turn measurements into failures. Ratios and run lengths are compared with
 * the profile; invented words, flipped negations and dropped numbers fail
 * under any profile.
 */
export function decide(input: DecisionInput): Failure[] {
	const { profile, metrics, novel, negations, numbers } = input;
	const failures: Failure[] = [];
	const fail = (code: FailureCode, message: string) => failures.push({ code, message });

	if (input.sourceCount === 0) {
		if (input.rewriteCount > 0) {
			fail("unexpected_content", "The source has no comparable words, but the rewrite does.");
		}
		return failures;
	}

	const needs = (value: number) => `the ${profile.name} profile needs ${percent(value)}`;
	if (metrics.orderedCoverage < profile.ordered) {
		fail(
			"ordered_coverage",
			`${percent(metrics.orderedCoverage)} of source words survive in order; ${needs(profile.ordered)}.`,
		);
	}
	if (metrics.lexicalCoverage < profile.lexical) {
		fail(
			"lexical_coverage",
			`${percent(metrics.lexicalCoverage)} of source words appear at all; ${needs(profile.lexical)}.`,
		);
	}
	if (metrics.orderRetention < profile.orderRetention) {
		fail(
			"order_retention",
			`Only ${percent(metrics.orderRetention)} of the kept words stay in source order; ${needs(profile.orderRetention)}.`,
		);
	}
	if (input.requirePayoff && metrics.payoffCoverage < profile.payoff) {
		fail(
			"payoff",
			`${percent(metrics.payoffCoverage)} of the ending's content words survive in order; ${needs(profile.payoff)}.`,
		);
	}
	if (metrics.longestMissingRun > profile.maxMissingRun) {
		fail(
			"dropped_span",
			`The rewrite drops ${stretch(metrics.longestMissingRun, input.spans.missing)}; the limit is ${profile.maxMissingRun}.`,
		);
	}
	if (metrics.longestMovedRun > profile.maxMovedRun) {
		fail(
			"moved_span",
			`${capitalize(stretch(metrics.longestMovedRun, input.spans.moved))} is out of source order; the limit is ${profile.maxMovedRun}.`,
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
	if (numbers.dropped.length > 0) {
		const plural = new Set(numbers.dropped.map((token) => token.text)).size > 1;
		fail("number", `The rewrite loses the number${plural ? "s" : ""} ${quoteList(numbers.dropped)}.`);
	}
	return failures;
}

// Rounds down so a value just under its threshold never displays as equal to it.
function percent(value: number) {
	return `${Math.floor(value * 1000 + 1e-9) / 10}%`;
}

function stretch(length: number, words: string) {
	if (length === 1) return `"${words}"`;
	const article = String(length).startsWith("8") || length === 11 || length === 18 ? "an" : "a";
	return `${article} ${length}-word stretch ("${words}")`;
}

function capitalize(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function quoteList(tokens: readonly TokenRef[]) {
	const unique = [...new Set(tokens.map((token) => token.text))];
	const shown = unique.slice(0, 6).map((text) => `"${text}"`);
	return unique.length > 6 ? `${shown.join(", ")} and ${unique.length - 6} more` : shown.join(", ");
}
