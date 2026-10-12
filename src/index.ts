export { type AnchorOptions, anchorSegments, type SegmentAnchor } from "./anchor.js";
export {
	checkFidelity,
	type Failure,
	type FailureCode,
	type FidelityMetrics,
	type FidelityOptions,
	type FidelityReport,
	type MovedToken,
	type TokenRef,
} from "./check.js";
export { type Alignment, DEFAULT_MAX_CELLS, type LcsOptions, lcsAlignment, lcsLength } from "./lcs.js";
export { english, type Locale } from "./locale.js";
export {
	PROFILES,
	type ProfileName,
	payoffLength,
	profileByName,
	profileFor,
	type ThresholdProfile,
	type Thresholds,
} from "./profiles.js";
export { checkPartition, findQuote, type PartitionResult, type QuoteMatch } from "./quotes.js";
export { normalizeWord, type Token, tokenize, tokenNorms } from "./tokenize.js";
export {
	type AlignedWord,
	type AlignmentFailure,
	type AlignTranscriptOptions,
	alignTranscript,
	normalizeSpokenWord,
	type TimedWord,
	type TranscriptAlignment,
	validateTimedWords,
} from "./transcript.js";
