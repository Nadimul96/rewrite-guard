import { english, type Locale } from "./locale.js";

/** One comparable word, with the span of the surface word it came from. */
export interface Token {
	/** Normalized form compared across texts. */
	readonly norm: string;
	/** Position in the token sequence. */
	readonly index: number;
	/** UTF-16 offsets of the surface word in the original text. */
	readonly start: number;
	readonly end: number;
}

// Letters, marks and digits, joined by apostrophes ("didn't") or by a
// separator between two digits ("3,000", "4.5", "9:30").
const WORD = /[\p{L}\p{M}\p{N}]+(?:(?:['’]|(?<=\p{N})[.,:](?=\p{N}))[\p{L}\p{M}\p{N}]+)*/gu;
const CLAUSE_BREAK = /[.!?;:—–\n]/u;
const THOUSANDS = /^\d{1,3}(?:,\d{3})+$/;
const BRACKETING_PUNCTUATION = "[,;:—–-]";
const CLOSING_PUNCTUATION = "[,;:.!?—–-]";

/**
 * Split text into normalized tokens while keeping the offsets of every
 * surface word, so a report can point at the exact characters it means.
 *
 * Normalization: NFKC, case folding, curly quotes, contractions expanded,
 * possessive "'s" stripped, thousands separators removed, number words mapped
 * to digits. Hesitation fillers, bracketed discourse fillers and optional
 * discourse markers are dropped.
 */
export function tokenize(text: string, locale: Locale = english): Token[] {
	const skipped = parentheticalFillerRanges(text, locale);
	const tokens: Token[] = [];
	let previousEnd = 0;
	let clauseStart = true;

	for (const match of text.matchAll(WORD)) {
		const start = match.index;
		const end = start + match[0].length;
		if (CLAUSE_BREAK.test(text.slice(previousEnd, start))) clauseStart = true;
		previousEnd = end;

		if (skipped.some(([from, to]) => start >= from && end <= to)) continue;
		const parts = normalizeWord(match[0], locale);
		const first = parts[0];
		const optional =
			first === undefined ||
			(parts.length === 1 &&
				(locale.fillers.has(first) ||
					locale.discourseMarkers.has(first) ||
					(clauseStart && locale.clauseInitialMarkers.has(first))));
		// A dropped word at the start of a clause leaves the clause start open,
		// so "Um, so I left" treats "so" as clause-initial too.
		if (optional) continue;
		clauseStart = false;
		for (const norm of parts) {
			tokens.push({ norm, index: tokens.length, start, end });
		}
	}
	return tokens;
}

/** Normalized forms of one surface word (several for a contraction). */
export function normalizeWord(surface: string, locale: Locale = english): string[] {
	let word = surface.normalize("NFKC").replace(/’/g, "'").toLocaleLowerCase(locale.id);
	if (THOUSANDS.test(word)) word = word.replace(/,/g, "");

	const expansion = locale.contractions[word];
	if (expansion) return [...expansion];
	if (word.endsWith("'s")) word = word.slice(0, -2);
	word = word.replace(/'/g, "");
	if (!word) return [];
	return [locale.numberWords[word] ?? word];
}

/** Normalized token strings only. */
export function tokenNorms(text: string, locale: Locale = english): string[] {
	return tokenize(text, locale).map((token) => token.norm);
}

function parentheticalFillerRanges(text: string, locale: Locale): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	for (const phrase of locale.parentheticalFillers) {
		const body = phrase.map(escapeRegExp).join("\\s+");
		const pattern = new RegExp(`${BRACKETING_PUNCTUATION}\\s*(${body})(?=\\s*${CLOSING_PUNCTUATION})`, "giu");
		for (const match of text.matchAll(pattern)) {
			const phraseText = match[1] ?? "";
			const from = match.index + match[0].length - phraseText.length;
			ranges.push([from, from + phraseText.length]);
		}
	}
	return ranges;
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
