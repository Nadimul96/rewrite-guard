import type { FailureCode, FidelityReport } from "../src/check.js";
import type { Thresholds } from "../src/profiles.js";
import { f1FromCounts } from "./metrics.js";

/** The threshold-independent numbers one check produces for one pair. */
export interface Features {
	readonly ordered: number;
	readonly lexical: number;
	readonly retention: number;
	readonly payoff: number;
	readonly missingRun: number;
	readonly movedRun: number;
	/** Novel tokens, a negation change or a lost number: fails under any thresholds. */
	readonly hardFail: boolean;
}

export interface Sample {
	readonly features: Features;
	readonly unfaithful: boolean;
	/** Perturbation type; the objective weights every type equally. */
	readonly type: string;
}

const HARD_FAILURES = new Set<FailureCode>(["novel_tokens", "negation", "number"]);

export function featuresOf(report: FidelityReport): Features {
	const { metrics } = report;
	return {
		ordered: metrics.orderedCoverage,
		lexical: metrics.lexicalCoverage,
		retention: metrics.orderRetention,
		payoff: metrics.payoffCoverage,
		missingRun: metrics.longestMissingRun,
		movedRun: metrics.longestMovedRun,
		hardFail: report.failures.some((failure) => HARD_FAILURES.has(failure.code)),
	};
}

/** Same decision as `checkFidelity`, from precomputed features. */
export function flagged(features: Features, thresholds: Thresholds): boolean {
	return (
		features.hardFail ||
		features.ordered < thresholds.ordered ||
		features.lexical < thresholds.lexical ||
		features.retention < thresholds.orderRetention ||
		features.payoff < thresholds.payoff ||
		features.missingRun > thresholds.maxMissingRun ||
		features.movedRun > thresholds.maxMovedRun
	);
}

type Dimension = keyof Thresholds;

interface Axis {
	readonly key: Dimension;
	/** Fine grid, ordered from most lenient to strictest. */
	readonly fine: readonly number[];
	readonly coarse: readonly number[];
	readonly fails: (features: Features, value: number) => boolean;
}

// 0 switches a ratio check off; the coarse grid is denser where useful values live.
const RATIOS = Array.from({ length: 101 }, (_, index) => index / 100);
const COARSE_RATIOS = [0, 0.25, ...RATIOS.filter((value, index) => value >= 0.5 && index % 5 === 0)];
const RUNS = [Number.POSITIVE_INFINITY, ...Array.from({ length: 21 }, (_, index) => 20 - index)];
const COARSE_RUNS = [Number.POSITIVE_INFINITY, 8, 6, 4, 3, 2, 1, 0];

const AXES: readonly Axis[] = [
	{ key: "ordered", fine: RATIOS, coarse: COARSE_RATIOS, fails: (f, v) => f.ordered < v },
	{ key: "lexical", fine: RATIOS, coarse: COARSE_RATIOS, fails: (f, v) => f.lexical < v },
	{ key: "orderRetention", fine: RATIOS, coarse: COARSE_RATIOS, fails: (f, v) => f.retention < v },
	{
		key: "payoff",
		fine: RATIOS,
		coarse: [0, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
		fails: (f, v) => f.payoff < v,
	},
	{ key: "maxMissingRun", fine: RUNS, coarse: COARSE_RUNS, fails: (f, v) => f.missingRun > v },
	{ key: "maxMovedRun", fine: RUNS, coarse: COARSE_RUNS, fails: (f, v) => f.movedRun > v },
];

export interface CalibrationResult {
	readonly thresholds: Thresholds;
	readonly f1: number;
	/** For each threshold, the most lenient and strictest values that give the same best score. */
	readonly plateaus: Record<Dimension, { readonly lenient: number; readonly strict: number }>;
}

/**
 * Choose thresholds that maximize type-balanced F1 (unfaithful = positive,
 * each perturbation type weighted equally so a common edit cannot drown out
 * a rare one) while keeping every capped faithful type under its
 * false-alarm limit. Then move each binding threshold to the middle of the
 * range of values that keep that score: the value least sensitive to a
 * slightly different sample, which is what a held-out split rewards. A check
 * that is not binding (its range reaches "off") is kept as a guard at the
 * strictest value in its range, so it still catches failure modes the
 * benchmark does not generate.
 *
 * Search: an exhaustive coarse grid using bitsets, then coordinate-wise
 * centering on a 0.01 grid (ratios) and integer grid (runs).
 */
export interface CalibrationOptions {
	/** Perturbation types whose false-alarm rate is capped. */
	readonly constrainedTypes: ReadonlySet<string>;
	/** Highest false-alarm rate allowed for each constrained type. */
	readonly maxFalseAlarm: number;
}

export function calibrate(samples: readonly Sample[], options: CalibrationOptions): CalibrationResult {
	const evaluator = new BitsetEvaluator(samples, options);
	const best = coarseSearch(evaluator);
	const bestF1 = evaluator.f1(best);
	const plateaus = {} as CalibrationResult["plateaus"];

	for (let sweep = 0; sweep < 10; sweep += 1) {
		let changed = false;
		for (const axis of AXES) {
			const scored = axis.fine.map((value) => evaluator.f1({ ...best, [axis.key]: value }));
			const current = axis.fine.indexOf(best[axis.key]);
			let low = current;
			let high = current;
			while (low > 0 && same(scored[low - 1] as number, bestF1)) low -= 1;
			while (high < axis.fine.length - 1 && same(scored[high + 1] as number, bestF1)) high += 1;
			// A binding threshold goes to the middle of its plateau. A plateau that
			// reaches the most lenient value means the check never decided anything
			// here; it stays on as a guard at the strictest value that cost nothing.
			const chosen = axis.fine[low === 0 ? high : Math.floor((low + high) / 2)] as number;
			plateaus[axis.key] = { lenient: axis.fine[low] as number, strict: axis.fine[high] as number };
			if (chosen !== best[axis.key]) {
				best[axis.key] = chosen;
				changed = true;
			}
		}
		if (!changed) break;
	}
	return { thresholds: { ...best }, f1: bestF1, plateaus };
}

function coarseSearch(evaluator: BitsetEvaluator): Record<Dimension, number> {
	let bestScore = -1;
	let best: Record<Dimension, number> | null = null;
	const current = {} as Record<Dimension, number>;
	const visit = (depth: number, mask: Uint32Array) => {
		const axis = AXES[depth];
		if (!axis) {
			const score = evaluator.f1Mask(mask);
			if (score > bestScore) {
				bestScore = score;
				best = { ...current };
			}
			return;
		}
		for (const value of axis.coarse) {
			current[axis.key] = value;
			visit(depth + 1, evaluator.or(mask, evaluator.failMask(axis, value)));
		}
	};
	visit(0, evaluator.hardMask);
	if (!best) throw new Error("calibration needs at least one sample");
	return best;
}

/**
 * Flags as bitsets so one threshold combination costs a few word operations.
 * Samples are sorted by perturbation type so each type's bits sit in a
 * compact range of words.
 */
class BitsetEvaluator {
	readonly hardMask: Uint32Array;
	private readonly samples: readonly Sample[];
	private readonly words: number;
	private readonly groups: Array<{
		mask: Uint32Array;
		size: number;
		unfaithful: boolean;
		capped: boolean;
		from: number;
		to: number;
	}>;
	private readonly cache = new Map<string, Uint32Array>();

	constructor(
		samples: readonly Sample[],
		private readonly options: CalibrationOptions,
	) {
		this.samples = [...samples].sort((left, right) => left.type.localeCompare(right.type));
		this.words = Math.ceil(this.samples.length / 32);
		this.hardMask = this.maskOf((sample) => sample.features.hardFail);
		const types = [...new Set(this.samples.map((sample) => sample.type))];
		this.groups = types.map((type) => {
			const indices = this.samples.flatMap((sample, index) => (sample.type === type ? [index] : []));
			return {
				mask: this.maskOf((sample) => sample.type === type),
				size: indices.length,
				unfaithful: (this.samples[indices[0] as number] as Sample).unfaithful,
				capped: options.constrainedTypes.has(type),
				from: (indices[0] as number) >>> 5,
				to: ((indices.at(-1) as number) >>> 5) + 1,
			};
		});
	}

	failMask(axis: Axis, value: number): Uint32Array {
		const key = `${axis.key}:${value}`;
		let mask = this.cache.get(key);
		if (!mask) {
			mask = this.maskOf((sample) => axis.fails(sample.features, value));
			this.cache.set(key, mask);
		}
		return mask;
	}

	or(left: Uint32Array, right: Uint32Array): Uint32Array {
		const out = new Uint32Array(this.words);
		for (let index = 0; index < this.words; index += 1) {
			out[index] = (left[index] as number) | (right[index] as number);
		}
		return out;
	}

	/**
	 * Type-balanced F1: every perturbation type carries the same total weight.
	 * Returns -1 when a capped type exceeds its false-alarm limit.
	 */
	f1Mask(flags: Uint32Array): number {
		let tp = 0;
		let fp = 0;
		let fn = 0;
		for (const group of this.groups) {
			let count = 0;
			for (let index = group.from; index < group.to; index += 1) {
				count += popcount((flags[index] as number) & (group.mask[index] as number));
			}
			const rate = count / group.size;
			if (group.capped && rate > this.options.maxFalseAlarm) return -1;
			if (group.unfaithful) {
				tp += rate;
				fn += 1 - rate;
			} else {
				fp += rate;
			}
		}
		return f1FromCounts(tp, fp, fn);
	}

	f1(thresholds: Thresholds): number {
		let mask = this.hardMask;
		for (const axis of AXES) mask = this.or(mask, this.failMask(axis, thresholds[axis.key]));
		return this.f1Mask(mask);
	}

	private maskOf(predicate: (sample: Sample) => boolean): Uint32Array {
		const mask = new Uint32Array(this.words);
		this.samples.forEach((sample, index) => {
			if (predicate(sample)) mask[index >>> 5] = (mask[index >>> 5] as number) | (1 << (index & 31));
		});
		return mask;
	}
}

function popcount(value: number): number {
	let v = value - ((value >>> 1) & 0x55555555);
	v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
	return (Math.imul((v + (v >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24) as number;
}

function same(left: number, right: number) {
	return Math.abs(left - right) < 1e-12;
}
