import { checkFidelity, type FailureCode } from "../src/check.js";
import type { ProfileName, ThresholdProfile } from "../src/profiles.js";
import type { LabeledPair, Split } from "./dataset.js";
import { confusion, type Scores, scores } from "./metrics.js";
import { PERTURBATION_TYPES, PERTURBATIONS, type PerturbationType } from "./perturb/index.js";

export interface Outcome {
	readonly pair: LabeledPair;
	readonly profile: ProfileName;
	readonly flagged: boolean;
	readonly codes: readonly FailureCode[];
}

/** Run the real `checkFidelity` on every pair under one profile table. */
export function evaluate(pairs: readonly LabeledPair[], profiles: readonly ThresholdProfile[]): Outcome[] {
	return pairs.map((pair) => {
		const report = checkFidelity(pair.source, pair.rewrite, { profiles });
		return {
			pair,
			profile: report.profile.name,
			flagged: !report.passes,
			codes: report.failures.map((failure) => failure.code),
		};
	});
}

export function scoreOf(outcomes: readonly Outcome[]): Scores {
	return scores(
		confusion(
			outcomes.map((outcome) => ({
				unfaithful: outcome.pair.label === "unfaithful",
				flagged: outcome.flagged,
			})),
		),
	);
}

export const inSplit = (split: Split) => (outcome: Outcome) => outcome.pair.split === split;

export interface TypeRow {
	readonly type: PerturbationType;
	readonly label: "faithful" | "unfaithful";
	readonly description: string;
	readonly n: number;
	/** Share of pairs flagged: recall for unfaithful types, false-alarm rate for faithful ones. */
	readonly flaggedRate: number;
	readonly flagged: number;
	/** How often each check fired on this type. */
	readonly caughtBy: Partial<Record<FailureCode, number>>;
}

export function byType(outcomes: readonly Outcome[]): TypeRow[] {
	return PERTURBATION_TYPES.map((type) => {
		const rows = outcomes.filter((outcome) => outcome.pair.type === type);
		const flagged = rows.filter((outcome) => outcome.flagged);
		const caughtBy: Partial<Record<FailureCode, number>> = {};
		for (const outcome of flagged) {
			for (const code of outcome.codes) caughtBy[code] = (caughtBy[code] ?? 0) + 1;
		}
		return {
			type,
			label: PERTURBATIONS[type].label,
			description: PERTURBATIONS[type].description,
			n: rows.length,
			flagged: flagged.length,
			flaggedRate: rows.length === 0 ? 0 : Math.round((flagged.length / rows.length) * 10_000) / 10_000,
			caughtBy: sortedRecord(caughtBy),
		};
	});
}

export function byProfile(outcomes: readonly Outcome[]): Partial<Record<ProfileName, Scores>> {
	const result: Partial<Record<ProfileName, Scores>> = {};
	for (const name of ["very_short", "short", "normal"] as const) {
		const rows = outcomes.filter((outcome) => outcome.profile === name);
		if (rows.length > 0) result[name] = scoreOf(rows);
	}
	return result;
}

function sortedRecord<K extends string>(record: Partial<Record<K, number>>): Partial<Record<K, number>> {
	return Object.fromEntries(
		Object.entries(record).sort(([, a], [, b]) => (b as number) - (a as number)),
	) as Partial<Record<K, number>>;
}
