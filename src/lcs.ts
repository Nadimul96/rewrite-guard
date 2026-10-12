/**
 * Longest common subsequence over token sequences.
 *
 * One implementation serves every caller: coverage, segment anchoring and
 * transcript alignment. Rows are `Uint32Array`, so counts are exact up to
 * 4,294,967,295 matched tokens. The alignment uses Hirschberg's
 * divide-and-conquer, so memory stays linear in the input while time is
 * O(n·m) on the part of the inputs that differs.
 */

/** Matched index pairs `[i, j]` with `a[i] === b[j]`, strictly increasing in both. */
export type Alignment = Array<[number, number]>;

export interface LcsOptions {
	/**
	 * Upper bound on DP cells (after trimming a shared prefix and suffix). Past
	 * this the call throws instead of silently running for minutes.
	 */
	readonly maxCells?: number;
}

export const DEFAULT_MAX_CELLS = 400_000_000;

// Below this many cells a full table with a direct backtrace is cheaper than
// recursing further.
const SMALL_PROBLEM_CELLS = 4_096;

export function lcsLength(a: readonly string[], b: readonly string[], options: LcsOptions = {}): number {
	const [x, y] = encode(a, b);
	const { prefix, suffix } = sharedEnds(x, y);
	const xHi = x.length - suffix;
	const yHi = y.length - suffix;
	guardSize(xHi - prefix, yHi - prefix, options);
	const row = forwardRow(x, prefix, xHi, y, prefix, yHi);
	return prefix + suffix + (row[yHi - prefix] ?? 0);
}

export function lcsAlignment(
	a: readonly string[],
	b: readonly string[],
	options: LcsOptions = {},
): Alignment {
	const [x, y] = encode(a, b);
	const { prefix, suffix } = sharedEnds(x, y);
	const xHi = x.length - suffix;
	const yHi = y.length - suffix;
	guardSize(xHi - prefix, yHi - prefix, options);

	const pairs: Alignment = [];
	for (let i = 0; i < prefix; i += 1) pairs.push([i, i]);
	hirschberg(x, prefix, xHi, y, prefix, yHi, pairs);
	for (let k = 0; k < suffix; k += 1) pairs.push([xHi + k, yHi + k]);
	return pairs;
}

/** Map tokens to small integers once so the inner loops compare numbers. */
function encode(a: readonly string[], b: readonly string[]): [Int32Array, Int32Array] {
	const ids = new Map<string, number>();
	const toIds = (tokens: readonly string[]) => {
		const out = new Int32Array(tokens.length);
		tokens.forEach((token, index) => {
			let id = ids.get(token);
			if (id === undefined) {
				id = ids.size;
				ids.set(token, id);
			}
			out[index] = id;
		});
		return out;
	};
	return [toIds(a), toIds(b)];
}

function sharedEnds(x: Int32Array, y: Int32Array) {
	const limit = Math.min(x.length, y.length);
	let prefix = 0;
	while (prefix < limit && x[prefix] === y[prefix]) prefix += 1;
	let suffix = 0;
	while (suffix < limit - prefix && x[x.length - 1 - suffix] === y[y.length - 1 - suffix]) {
		suffix += 1;
	}
	return { prefix, suffix };
}

function guardSize(n: number, m: number, options: LcsOptions) {
	const maxCells = options.maxCells ?? DEFAULT_MAX_CELLS;
	if (n * m > maxCells) {
		throw new RangeError(
			`Alignment needs ${n * m} cells after trimming shared text, above the limit of ${maxCells}. Split the input or raise maxCells.`,
		);
	}
}

/** LCS lengths of x[xLo..xHi) against every prefix of y[yLo..yHi). */
function forwardRow(
	x: Int32Array,
	xLo: number,
	xHi: number,
	y: Int32Array,
	yLo: number,
	yHi: number,
): Uint32Array {
	const width = yHi - yLo;
	const row = new Uint32Array(width + 1);
	for (let i = xLo; i < xHi; i += 1) {
		const token = x[i];
		let diagonal = 0;
		for (let j = 1; j <= width; j += 1) {
			const above = row[j] as number;
			if (token === y[yLo + j - 1]) {
				row[j] = diagonal + 1;
			} else {
				const left = row[j - 1] as number;
				if (left > above) row[j] = left;
			}
			diagonal = above;
		}
	}
	return row;
}

/** LCS lengths of x[xLo..xHi) against every suffix of y[yLo..yHi), indexed by suffix length. */
function backwardRow(
	x: Int32Array,
	xLo: number,
	xHi: number,
	y: Int32Array,
	yLo: number,
	yHi: number,
): Uint32Array {
	const width = yHi - yLo;
	const row = new Uint32Array(width + 1);
	for (let i = xHi - 1; i >= xLo; i -= 1) {
		const token = x[i];
		let diagonal = 0;
		for (let j = 1; j <= width; j += 1) {
			const above = row[j] as number;
			if (token === y[yHi - j]) {
				row[j] = diagonal + 1;
			} else {
				const left = row[j - 1] as number;
				if (left > above) row[j] = left;
			}
			diagonal = above;
		}
	}
	return row;
}

function hirschberg(
	x: Int32Array,
	xLo: number,
	xHi: number,
	y: Int32Array,
	yLo: number,
	yHi: number,
	out: Alignment,
): void {
	const n = xHi - xLo;
	const m = yHi - yLo;
	if (n === 0 || m === 0) return;
	if (n * m <= SMALL_PROBLEM_CELLS || n === 1) {
		tableAlignment(x, xLo, xHi, y, yLo, yHi, out);
		return;
	}

	const xMid = xLo + (n >> 1);
	const forward = forwardRow(x, xLo, xMid, y, yLo, yHi);
	const backward = backwardRow(x, xMid, xHi, y, yLo, yHi);
	let bestSplit = 0;
	let bestScore = -1;
	for (let k = 0; k <= m; k += 1) {
		const score = (forward[k] as number) + (backward[m - k] as number);
		if (score > bestScore) {
			bestScore = score;
			bestSplit = k;
		}
	}
	hirschberg(x, xLo, xMid, y, yLo, yLo + bestSplit, out);
	hirschberg(x, xMid, xHi, y, yLo + bestSplit, yHi, out);
}

/** Full DP table with a backtrace that prefers a diagonal match. */
function tableAlignment(
	x: Int32Array,
	xLo: number,
	xHi: number,
	y: Int32Array,
	yLo: number,
	yHi: number,
	out: Alignment,
): void {
	const n = xHi - xLo;
	const m = yHi - yLo;
	const width = m + 1;
	const table = new Uint32Array((n + 1) * width);
	for (let i = 1; i <= n; i += 1) {
		for (let j = 1; j <= m; j += 1) {
			const cell = i * width + j;
			table[cell] =
				x[xLo + i - 1] === y[yLo + j - 1]
					? (table[cell - width - 1] as number) + 1
					: Math.max(table[cell - width] as number, table[cell - 1] as number);
		}
	}

	const reversed: Alignment = [];
	let i = n;
	let j = m;
	while (i > 0 && j > 0) {
		if (x[xLo + i - 1] === y[yLo + j - 1]) {
			reversed.push([xLo + i - 1, yLo + j - 1]);
			i -= 1;
			j -= 1;
		} else if ((table[(i - 1) * width + j] as number) >= (table[i * width + j - 1] as number)) {
			i -= 1;
		} else {
			j -= 1;
		}
	}
	for (let k = reversed.length - 1; k >= 0; k -= 1) out.push(reversed[k] as [number, number]);
}
