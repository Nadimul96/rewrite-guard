import { PROFILES, type ThresholdProfile, type Thresholds } from "../src/profiles.js";

/**
 * The thresholds the source material shipped with, set by hand: 78% ordered,
 * 82% lexical, 90% order retention for normal-length texts, 50/55/70 for
 * short ones, the whole ending required, and no run-length limits (the
 * original had none). Kept only to compare against the calibrated profiles.
 */
const HAND_SET: Record<"short" | "normal", Thresholds> = {
	short: {
		ordered: 0.5,
		lexical: 0.55,
		orderRetention: 0.7,
		payoff: 1,
		maxMissingRun: Number.POSITIVE_INFINITY,
		maxMovedRun: Number.POSITIVE_INFINITY,
	},
	normal: {
		ordered: 0.78,
		lexical: 0.82,
		orderRetention: 0.9,
		payoff: 1,
		maxMissingRun: Number.POSITIVE_INFINITY,
		maxMovedRun: Number.POSITIVE_INFINITY,
	},
};

export const HAND_SET_PROFILES: readonly ThresholdProfile[] = PROFILES.map((profile) =>
	profile.name === "short" || profile.name === "normal" ? { ...profile, ...HAND_SET[profile.name] } : profile,
);
