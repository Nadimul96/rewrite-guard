export interface Confusion {
	/** Unfaithful and flagged. */
	readonly tp: number;
	/** Faithful but flagged. */
	readonly fp: number;
	/** Faithful and passed. */
	readonly tn: number;
	/** Unfaithful but passed. */
	readonly fn: number;
}

export interface Scores extends Confusion {
	readonly n: number;
	readonly precision: number;
	readonly recall: number;
	readonly f1: number;
	readonly falsePositiveRate: number;
	readonly accuracy: number;
}

/** "Positive" means unfaithful: the checker's job is to flag it. */
export function confusion(items: Iterable<{ unfaithful: boolean; flagged: boolean }>): Confusion {
	let tp = 0;
	let fp = 0;
	let tn = 0;
	let fn = 0;
	for (const { unfaithful, flagged } of items) {
		if (unfaithful && flagged) tp += 1;
		else if (unfaithful) fn += 1;
		else if (flagged) fp += 1;
		else tn += 1;
	}
	return { tp, fp, tn, fn };
}

export function scores(matrix: Confusion): Scores {
	const { tp, fp, tn, fn } = matrix;
	const precision = safe(tp, tp + fp);
	const recall = safe(tp, tp + fn);
	return {
		...matrix,
		n: tp + fp + tn + fn,
		precision: round(precision),
		recall: round(recall),
		f1: round(safe(2 * precision * recall, precision + recall)),
		falsePositiveRate: round(safe(fp, fp + tn)),
		accuracy: round(safe(tp + tn, tp + fp + tn + fn)),
	};
}

/** F1 from (possibly weighted) counts, used inside the calibration loop. */
export function f1FromCounts(tp: number, fp: number, fn: number): number {
	return tp === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn);
}

function safe(numerator: number, denominator: number) {
	return denominator === 0 ? 0 : numerator / denominator;
}

export function round(value: number) {
	return Math.round(value * 10_000) / 10_000;
}
