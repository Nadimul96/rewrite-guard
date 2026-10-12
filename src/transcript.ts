import { type LcsOptions, lcsAlignment } from "./lcs.js";

/** A word with measured timing, as returned by speech recognition. */
export interface TimedWord {
	readonly text: string;
	readonly start: number;
	readonly end: number;
}

export interface AlignedWord extends TimedWord {
	/** "measured" comes straight from the transcript; "interpolated" fills a short gap. */
	readonly timing: "measured" | "interpolated";
	/** Index of the transcript word that supplied the timing, if any. */
	readonly transcriptIndex: number | null;
}

export type AlignmentFailure =
	| "empty_script"
	| "invalid_timing"
	| "invalid_duration"
	| "low_script_match"
	| "low_transcript_match"
	| "unmatched_run_too_long"
	| "gap_too_small";

export type TranscriptAlignment =
	| {
			readonly ok: true;
			readonly words: readonly AlignedWord[];
			readonly scriptMatchRatio: number;
			readonly transcriptMatchRatio: number;
	  }
	| {
			readonly ok: false;
			readonly reason: AlignmentFailure;
			readonly message: string;
	  };

export interface AlignTranscriptOptions extends LcsOptions {
	/** Decoded audio length in seconds; lets a trailing run use the tail. */
	readonly audioDuration?: number;
	/** Share of script words that must match a transcript word. */
	readonly minScriptMatch?: number;
	/** Share of transcript words that must match a script word. */
	readonly minTranscriptMatch?: number;
	/** Longest run of unmatched script words that may be interpolated. */
	readonly maxUnmatchedRun?: number;
	/** Minimum seconds per interpolated word; a tighter gap fails. */
	readonly minInterpolatedWordSeconds?: number;
}

/**
 * Put measured word timestamps (from ASR) onto the exact words of a script.
 *
 * The output keeps the script's own text, punctuation and casing. Timing
 * comes only from the transcript: a short run of script words the recognizer
 * missed may be spread across a real measured gap, but broad disagreement,
 * malformed timing or a gap too small to hold the missing words fails with a
 * reason instead of guessing.
 */
export function alignTranscript(
	script: string,
	transcript: readonly TimedWord[],
	options: AlignTranscriptOptions = {},
): TranscriptAlignment {
	const minScriptMatch = options.minScriptMatch ?? 0.8;
	const minTranscriptMatch = options.minTranscriptMatch ?? 0.7;
	const maxUnmatchedRun = options.maxUnmatchedRun ?? 3;
	const minWordSeconds = options.minInterpolatedWordSeconds ?? 0.03;

	const scriptWords = script
		.trim()
		.split(/\s+/u)
		.map((text) => ({ text, norm: normalizeSpokenWord(text) }))
		.filter((word) => word.norm.length > 0);
	if (scriptWords.length === 0) {
		return failure("empty_script", "The script has no words to align.");
	}
	const timingProblem = validateTimedWords(transcript);
	if (timingProblem) return failure("invalid_timing", timingProblem);
	if (transcript.length === 0) {
		return failure("invalid_timing", "The transcript has no timed words.");
	}
	const measuredEnd = (transcript.at(-1) as TimedWord).end;
	const { audioDuration } = options;
	if (audioDuration !== undefined && (!Number.isFinite(audioDuration) || audioDuration <= 0)) {
		return failure("invalid_duration", `Audio duration ${audioDuration} is not a positive number.`);
	}
	// Recognizers can stamp the last word slightly past the decoded length
	// (codec padding), so the later of the two bounds the trailing gap.
	const audioEnd = Math.max(audioDuration ?? 0, measuredEnd);

	const transcriptNorms = transcript.map((word) => normalizeSpokenWord(word.text));
	const alignment = lcsAlignment(
		scriptWords.map((word) => word.norm),
		transcriptNorms,
		options,
	);
	const scriptMatchRatio = alignment.length / scriptWords.length;
	const transcriptMatchRatio = alignment.length / transcript.length;
	if (scriptMatchRatio < minScriptMatch) {
		return failure(
			"low_script_match",
			`Only ${percent(scriptMatchRatio)} of script words were heard; at least ${percent(minScriptMatch)} is required.`,
		);
	}
	if (transcriptMatchRatio < minTranscriptMatch) {
		return failure(
			"low_transcript_match",
			`Only ${percent(transcriptMatchRatio)} of transcript words match the script; at least ${percent(minTranscriptMatch)} is required.`,
		);
	}

	const sourceOf = new Array<number | null>(scriptWords.length).fill(null);
	for (const [scriptIndex, transcriptIndex] of alignment) sourceOf[scriptIndex] = transcriptIndex;

	const aligned: AlignedWord[] = [];
	let index = 0;
	while (index < scriptWords.length) {
		const transcriptIndex = sourceOf[index] ?? null;
		if (transcriptIndex !== null) {
			const measured = transcript[transcriptIndex] as TimedWord;
			aligned.push({
				text: (scriptWords[index] as { text: string }).text,
				start: measured.start,
				end: measured.end,
				timing: "measured",
				transcriptIndex,
			});
			index += 1;
			continue;
		}

		const runStart = index;
		while (index < scriptWords.length && sourceOf[index] === null) index += 1;
		const runLength = index - runStart;
		if (runLength > maxUnmatchedRun) {
			return failure(
				"unmatched_run_too_long",
				`${runLength} consecutive script words were not heard (from "${scriptWords[runStart]?.text}"); at most ${maxUnmatchedRun} can be interpolated.`,
			);
		}
		const gapStart = aligned.at(-1)?.end ?? 0;
		const nextIndex = sourceOf[index];
		const gapEnd =
			nextIndex === undefined || nextIndex === null ? audioEnd : (transcript[nextIndex] as TimedWord).start;
		const available = gapEnd - gapStart;
		if (available < runLength * minWordSeconds) {
			return failure(
				"gap_too_small",
				`${runLength} unheard word(s) from "${scriptWords[runStart]?.text}" need ${runLength * minWordSeconds}s but the measured gap is ${round(available)}s.`,
			);
		}
		const step = available / runLength;
		for (let offset = 0; offset < runLength; offset += 1) {
			aligned.push({
				text: (scriptWords[runStart + offset] as { text: string }).text,
				start: round(gapStart + offset * step),
				end: round(gapStart + (offset + 1) * step),
				timing: "interpolated",
				transcriptIndex: null,
			});
		}
	}

	return { ok: true, words: aligned, scriptMatchRatio, transcriptMatchRatio };
}

/**
 * Check that timed words are well formed: non-empty text, finite times,
 * positive durations, and no word starting before the previous one ends.
 * Returns a description of the first problem, or null.
 */
export function validateTimedWords(words: readonly TimedWord[]): string | null {
	let previousEnd = 0;
	for (const [index, word] of words.entries()) {
		if (typeof word.text !== "string" || !word.text.trim()) {
			return `Word ${index} has no text.`;
		}
		if (!Number.isFinite(word.start) || !Number.isFinite(word.end)) {
			return `Word ${index} ("${word.text}") has a non-finite time.`;
		}
		if (word.start < 0 || word.end <= word.start) {
			return `Word ${index} ("${word.text}") has an empty or negative span ${word.start}-${word.end}.`;
		}
		if (word.start < previousEnd) {
			return `Word ${index} ("${word.text}") starts at ${word.start}, before the previous word ends at ${previousEnd}.`;
		}
		previousEnd = word.end;
	}
	return null;
}

/** Case- and punctuation-insensitive form used to match script and ASR words. */
export function normalizeSpokenWord(value: string): string {
	return value
		.normalize("NFKD")
		.toLocaleLowerCase("en-US")
		.replace(/[^\p{L}\p{N}]+/gu, "");
}

function failure(reason: AlignmentFailure, message: string): TranscriptAlignment {
	return { ok: false, reason, message };
}

function percent(value: number) {
	return `${Math.round(value * 1000) / 10}%`;
}

function round(value: number) {
	return Math.round(value * 1_000_000) / 1_000_000;
}
