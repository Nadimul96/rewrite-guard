import type { FidelityReport, TokenRef } from "../check.js";
import type { TranscriptAlignment } from "../transcript.js";

export interface Style {
	bold(text: string): string;
	dim(text: string): string;
	good(text: string): string;
	bad(text: string): string;
	warn(text: string): string;
	accent(text: string): string;
}

const ansi = (open: number, close: number) => (text: string) => `\u001b[${open}m${text}\u001b[${close}m`;

export const COLOR: Style = {
	bold: ansi(1, 22),
	dim: ansi(2, 22),
	good: ansi(32, 39),
	bad: ansi(31, 39),
	warn: ansi(33, 39),
	accent: ansi(35, 39),
};

const identity = (text: string) => text;
export const PLAIN: Style = {
	bold: identity,
	dim: identity,
	good: identity,
	bad: identity,
	warn: identity,
	accent: identity,
};

/** Human-readable report for a terminal. */
export function formatReport(report: FidelityReport, source: string, rewrite: string, style: Style): string {
	const { profile, metrics, counts } = report;
	const verdict = report.passes ? style.good(style.bold("PASS")) : style.bad(style.bold("FAIL"));
	const lines = [
		`${verdict}  ${style.dim(`${profile.name} profile · ${counts.sourceTokens} source tokens · ${counts.rewriteTokens} rewrite tokens`)}`,
		"",
	];

	const failed = new Set(report.failures.map((failure) => failure.code));
	const minimum = (value: number) => (value === 0 ? "off" : `>= ${pct(value)}`);
	const maximum = (value: number) => (Number.isFinite(value) ? `<= ${value}` : "off");
	const rows: Array<[string, string, string, boolean]> = [
		[
			"ordered coverage",
			pct(metrics.orderedCoverage),
			minimum(profile.ordered),
			!failed.has("ordered_coverage"),
		],
		[
			"lexical coverage",
			pct(metrics.lexicalCoverage),
			minimum(profile.lexical),
			!failed.has("lexical_coverage"),
		],
		[
			"order retention",
			pct(metrics.orderRetention),
			minimum(profile.orderRetention),
			!failed.has("order_retention"),
		],
		["ending coverage", pct(metrics.payoffCoverage), minimum(profile.payoff), !failed.has("payoff")],
		[
			"longest dropped run",
			String(metrics.longestMissingRun),
			maximum(profile.maxMissingRun),
			!failed.has("dropped_span"),
		],
		[
			"longest moved run",
			String(metrics.longestMovedRun),
			maximum(profile.maxMovedRun),
			!failed.has("moved_span"),
		],
		["invented words", String(report.novel.length), "<= 0", !failed.has("novel_tokens")],
		[
			"negation changes",
			String(report.negations.dropped.length + report.negations.added.length),
			"<= 0",
			!failed.has("negation"),
		],
		["lost numbers", String(report.numbers.dropped.length), "<= 0", !failed.has("number")],
	];
	for (const [label, value, needs, ok] of rows) {
		const mark = ok ? style.good("ok") : style.bad("FAIL");
		lines.push(`  ${label.padEnd(20)} ${value.padStart(7)}   ${style.dim(needs.padEnd(9))} ${mark}`);
	}

	if (report.failures.length > 0) {
		lines.push("", style.bold("Why it failed"));
		for (const failure of report.failures) lines.push(`  - ${failure.message}`);
	}

	const listed: Array<[string, readonly TokenRef[], string, (text: string) => string]> = [
		["Invented", report.novel, rewrite, style.accent],
		["Missing", report.missing, source, style.bad],
		["Moved", report.moved.map((pair) => pair.source), source, style.warn],
	];
	const details = listed.filter(([, tokens]) => tokens.length > 0);
	if (details.length > 0) lines.push("");
	for (const [label, tokens, text, paint] of details) {
		const shown = tokens
			.slice(0, 12)
			.map((token) => `${paint(`"${token.text}"`)} ${style.dim(position(text, token.start))}`);
		const more = tokens.length > 12 ? style.dim(` and ${tokens.length - 12} more`) : "";
		lines.push(`  ${label.padEnd(9)} ${shown.join(", ")}${more}`);
	}
	return lines.join("\n");
}

/** Report without the full token lists, with positions as line and column. */
export function reportToJson(report: FidelityReport, source: string, rewrite: string) {
	const ref = (text: string) => (token: TokenRef) => ({
		text: token.text,
		norm: token.norm,
		index: token.index,
		start: token.start,
		end: token.end,
		...lineColumn(text, token.start),
	});
	const { profile } = report;
	return {
		passes: report.passes,
		failures: report.failures,
		profile: {
			...profile,
			maxTokens: finiteOrNull(profile.maxTokens),
			maxMissingRun: finiteOrNull(profile.maxMissingRun),
			maxMovedRun: finiteOrNull(profile.maxMovedRun),
		},
		counts: report.counts,
		metrics: report.metrics,
		missing: report.missing.map(ref(source)),
		novel: report.novel.map(ref(rewrite)),
		moved: report.moved.map((pair) => ({
			source: ref(source)(pair.source),
			rewrite: ref(rewrite)(pair.rewrite),
		})),
		negations: {
			dropped: report.negations.dropped.map(ref(source)),
			added: report.negations.added.map(ref(rewrite)),
		},
		payoff: { range: report.payoff.range, missing: report.payoff.missing.map(ref(source)) },
	};
}

export function formatAlignment(result: TranscriptAlignment, style: Style): string {
	if (!result.ok) {
		return `${style.bad(style.bold("FAIL"))}  ${style.dim(result.reason)}\n  ${result.message}`;
	}
	const interpolated = result.words.filter((word) => word.timing === "interpolated").length;
	const lines = [
		`${style.good(style.bold("ALIGNED"))}  ${style.dim(
			`${result.words.length} script words · ${pct(result.scriptMatchRatio)} heard · ${interpolated} interpolated`,
		)}`,
		"",
	];
	for (const word of result.words) {
		const timing = `${word.start.toFixed(2).padStart(7)} - ${word.end.toFixed(2).padEnd(7)}`;
		const note = word.timing === "interpolated" ? style.warn("interpolated") : "";
		lines.push(`  ${style.dim(timing)} ${word.text} ${note}`.trimEnd());
	}
	return lines.join("\n");
}

function pct(value: number) {
	return `${(Math.floor(value * 1000 + 1e-9) / 10).toFixed(1)}%`;
}

function finiteOrNull(value: number) {
	return Number.isFinite(value) ? value : null;
}

function lineColumn(text: string, offset: number) {
	const before = text.slice(0, offset);
	const line = before.split("\n").length;
	const column = offset - before.lastIndexOf("\n");
	return { line, column };
}

function position(text: string, offset: number) {
	const { line, column } = lineColumn(text, offset);
	return `${line}:${column}`;
}
