import { english } from "../src/locale.js";
import { tokenNorms } from "../src/tokenize.js";
import {
	buildUnits,
	PARAPHRASES,
	PEOPLE,
	PLACES,
	PROPER_NOUNS,
	type Unit,
	type UnitLevel,
} from "./corpus/index.js";
import { type Label, PERTURBATION_TYPES, PERTURBATIONS, type PerturbationType } from "./perturb/index.js";
import { hash, seeded } from "./rng.js";

export type Split = "calibration" | "test";

export interface LabeledPair {
	readonly id: string;
	readonly unitId: string;
	readonly documentId: string;
	readonly level: UnitLevel;
	readonly type: PerturbationType;
	readonly label: Label;
	readonly split: Split;
	readonly source: string;
	readonly rewrite: string;
	readonly note: string;
}

export interface Dataset {
	readonly pairs: readonly LabeledPair[];
	/** Unfaithful edits that happened not to change any comparable token. */
	readonly discarded: readonly string[];
}

/**
 * Generate every labeled pair. Deterministic: each (unit, perturbation) pair
 * has its own seeded random stream, so adding a perturbation type never
 * changes the pairs of another.
 */
export function buildDataset(): Dataset {
	const units = buildUnits();
	const splits = assignSplits(units);
	const context = {
		properNouns: PROPER_NOUNS,
		people: PEOPLE,
		names: new Set([...PEOPLE, ...PLACES]),
		paraphrases: PARAPHRASES,
		glueWords: english.glueWords,
	};
	const pairs: LabeledPair[] = [];
	const discarded: string[] = [];

	for (const unit of units) {
		for (const type of PERTURBATION_TYPES) {
			const spec = PERTURBATIONS[type];
			const id = `${unit.id}::${type}`;
			const result = spec.apply(unit, seeded(id), context);
			if (!result) continue;
			if (spec.label === "unfaithful" && sameTokens(result.source, result.rewrite)) {
				discarded.push(id);
				continue;
			}
			pairs.push({
				id,
				unitId: unit.id,
				documentId: unit.documentId,
				level: unit.level,
				type,
				label: spec.label,
				split: splits.get(unit.documentId) ?? "test",
				...result,
			});
		}
	}
	return { pairs, discarded };
}

/**
 * Half of the documents (and phrases) calibrate the thresholds; the other
 * half only measure them. The split is stratified by kind so both halves see
 * stories, fables, notices and phrases, and whole documents stay on one side,
 * so a sentence never leaks into the half its document is not in.
 */
function assignSplits(units: readonly Unit[]): Map<string, Split> {
	const byKind = new Map<string, string[]>();
	for (const unit of units) {
		if (unit.level === "sentence") continue;
		const ids = byKind.get(unit.kind) ?? [];
		ids.push(unit.documentId);
		byKind.set(unit.kind, ids);
	}
	const splits = new Map<string, Split>();
	for (const ids of byKind.values()) {
		ids.sort((left, right) => hash(left) - hash(right) || left.localeCompare(right));
		ids.forEach((id, index) => {
			splits.set(id, index % 2 === 0 ? "calibration" : "test");
		});
	}
	return splits;
}

function sameTokens(left: string, right: string) {
	const a = tokenNorms(left);
	const b = tokenNorms(right);
	return a.length === b.length && a.every((token, index) => token === b[index]);
}
