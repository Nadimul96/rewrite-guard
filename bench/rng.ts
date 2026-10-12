/** Deterministic randomness: the same key always yields the same sequence. */
export type Rng = () => number;

/** 32-bit FNV-1a hash of a string. */
export function hash(key: string): number {
	let value = 0x811c9dc5;
	for (let index = 0; index < key.length; index += 1) {
		value ^= key.charCodeAt(index);
		value = Math.imul(value, 0x01000193);
	}
	return value >>> 0;
}

/** mulberry32 seeded from a string key. */
export function seeded(key: string): Rng {
	let state = hash(key);
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
	if (items.length === 0) throw new RangeError("pick() needs at least one item");
	return items[Math.floor(rng() * items.length)] as T;
}

export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
	const copy = [...items];
	for (let index = copy.length - 1; index > 0; index -= 1) {
		const swap = Math.floor(rng() * (index + 1));
		[copy[index], copy[swap]] = [copy[swap] as T, copy[index] as T];
	}
	return copy;
}
