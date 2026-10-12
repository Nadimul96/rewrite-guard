/**
 * Length-based threshold profiles.
 *
 * A ratio means different things at different lengths: losing one token of
 * four is a different claim, losing one of sixty is often a dropped article.
 * The profile is chosen by the number of comparable source tokens.
 *
 * The `short` and `normal` values are calibrated by `pnpm bench` on the
 * calibration half of the adversarial benchmark (see bench/calibrate.ts and
 * the README). `maxMissingRun: 0` means no content word may be dropped; the
 * ratio limits are guards set at the strictest values that caused no false
 * alarm there; a payoff of 0 means that check is off. `very_short` is exact by
 * design, and `pnpm bench:check` fails if these numbers drift from what the
 * benchmark produces.
 */
export type ProfileName = "empty" | "very_short" | "short" | "normal";

export interface Thresholds {
	/** Minimum share of source tokens kept in source order (LCS / source). */
	readonly ordered: number;
	/** Minimum share of source tokens present anywhere (multiset overlap / source). */
	readonly lexical: number;
	/** Minimum share of present tokens that are also in order (LCS / overlap). */
	readonly orderRetention: number;
	/** Minimum share of the final source span (the payoff) kept in order. */
	readonly payoff: number;
	/** Longest block of dropped source tokens allowed (content-word spans, see runs.ts). */
	readonly maxMissingRun: number;
	/** Longest block of out-of-order source tokens allowed. */
	readonly maxMovedRun: number;
}

export interface ThresholdProfile extends Thresholds {
	readonly name: ProfileName;
	/** Inclusive bounds on the number of comparable source tokens. */
	readonly minTokens: number;
	readonly maxTokens: number;
}

const EXACT: Thresholds = {
	ordered: 1,
	lexical: 1,
	orderRetention: 1,
	payoff: 1,
	maxMissingRun: 0,
	maxMovedRun: 0,
};

export const PROFILES: readonly ThresholdProfile[] = [
	{ name: "empty", minTokens: 0, maxTokens: 0, ...EXACT },
	{ name: "very_short", minTokens: 1, maxTokens: 4, ...EXACT },
	{
		name: "short",
		minTokens: 5,
		maxTokens: 11,
		ordered: 0.5,
		lexical: 0.77,
		orderRetention: 0.5,
		payoff: 0,
		maxMissingRun: 0,
		maxMovedRun: 5,
	},
	{
		name: "normal",
		minTokens: 12,
		maxTokens: Number.POSITIVE_INFINITY,
		ordered: 0.58,
		lexical: 0.84,
		orderRetention: 0.58,
		payoff: 0,
		maxMissingRun: 0,
		maxMovedRun: 6,
	},
];

export function profileFor(
	sourceTokenCount: number,
	profiles: readonly ThresholdProfile[] = PROFILES,
): ThresholdProfile {
	const match = profiles.find(
		(profile) => sourceTokenCount >= profile.minTokens && sourceTokenCount <= profile.maxTokens,
	);
	if (!match) throw new RangeError(`No threshold profile covers ${sourceTokenCount} tokens.`);
	return match;
}

export function profileByName(
	name: ProfileName,
	profiles: readonly ThresholdProfile[] = PROFILES,
): ThresholdProfile {
	const match = profiles.find((profile) => profile.name === name);
	if (!match) throw new RangeError(`Unknown threshold profile "${name}".`);
	return match;
}

/**
 * Number of trailing source tokens treated as the payoff: 18% of the text,
 * at least one and at most twelve tokens.
 */
export function payoffLength(sourceTokenCount: number): number {
	if (sourceTokenCount === 0) return 0;
	return Math.max(1, Math.min(12, Math.ceil(sourceTokenCount * 0.18)));
}
