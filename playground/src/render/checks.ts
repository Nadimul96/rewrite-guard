import type { FailureCode, FidelityReport } from "../../../src/check.js";
import { h, percent } from "../dom.js";

interface RatioRow {
	readonly label: string;
	readonly hint: string;
	readonly value: number;
	readonly threshold: number;
	readonly code: FailureCode;
}

interface CountRow {
	readonly label: string;
	readonly hint: string;
	readonly value: number;
	readonly limit: number;
	readonly code: FailureCode;
}

/** Coverage gauges with their threshold ticks, then the count checks. */
export function renderChecks(container: HTMLElement, report: FidelityReport | null): void {
	if (!report) {
		container.replaceChildren(
			h("h2", { class: "card__title" }, "Checks"),
			h("p", { class: "muted small" }, "Coverage, order and invented-word checks appear here."),
		);
		return;
	}
	const { metrics, profile } = report;
	const failed = new Set(report.failures.map((failure) => failure.code));
	const ratios: RatioRow[] = [
		{
			label: "Lexical coverage",
			hint: "source words present anywhere",
			value: metrics.lexicalCoverage,
			threshold: profile.lexical,
			code: "lexical_coverage",
		},
		{
			label: "Ordered coverage",
			hint: "source words kept in source order",
			value: metrics.orderedCoverage,
			threshold: profile.ordered,
			code: "ordered_coverage",
		},
		{
			label: "Order retention",
			hint: "kept words that are also in order",
			value: metrics.orderRetention,
			threshold: profile.orderRetention,
			code: "order_retention",
		},
		{
			label: "Ending coverage",
			hint: "content words of the final span",
			value: metrics.payoffCoverage,
			threshold: profile.payoff,
			code: "payoff",
		},
	];
	const counts: CountRow[] = [
		{
			label: "Longest dropped span",
			hint: "content words missing in a row",
			value: metrics.longestMissingRun,
			limit: profile.maxMissingRun,
			code: "dropped_span",
		},
		{
			label: "Longest moved span",
			hint: "words present but out of order",
			value: metrics.longestMovedRun,
			limit: profile.maxMovedRun,
			code: "moved_span",
		},
		{
			label: "Invented words",
			hint: "no support in source or evidence",
			value: report.novel.length,
			limit: 0,
			code: "novel_tokens",
		},
		{
			label: "Negation changes",
			hint: "not, never, no, nobody…",
			value: report.negations.dropped.length + report.negations.added.length,
			limit: 0,
			code: "negation",
		},
		{
			label: "Lost numbers",
			hint: "source numbers not in the rewrite",
			value: report.numbers.dropped.length,
			limit: 0,
			code: "number",
		},
	];

	container.replaceChildren(
		h("h2", { class: "card__title" }, "Checks"),
		h("ul", { class: "gauges" }, ...ratios.map((row) => gauge(row, failed.has(row.code)))),
		h("ul", { class: "counts" }, ...counts.map((row) => countRow(row, failed.has(row.code)))),
	);
}

function gauge(row: RatioRow, failed: boolean): HTMLElement {
	const off = row.threshold === 0;
	const fill = h("span", { class: "gauge__fill" });
	fill.style.width = `${Math.max(0, Math.min(1, row.value)) * 100}%`;
	const track = h("span", { class: "gauge__track", "aria-hidden": "true" }, fill);
	if (!off) {
		const tick = h("span", { class: "gauge__tick" });
		tick.style.left = `${row.threshold * 100}%`;
		track.append(tick);
	}
	const state = off ? "off" : failed ? "fail" : "pass";
	return h(
		"li",
		{ class: `gauge gauge--${state}` },
		h(
			"div",
			{ class: "gauge__head" },
			h("span", { class: "gauge__label", title: row.hint }, row.label),
			h(
				"span",
				{ class: "gauge__value" },
				percent(row.value),
				h("span", { class: "gauge__needs" }, off ? "not enforced" : `needs ${percent(row.threshold, 0)}`),
			),
		),
		track,
	);
}

function countRow(row: CountRow, failed: boolean): HTMLElement {
	const off = !Number.isFinite(row.limit);
	const state = off ? "off" : failed ? "fail" : "pass";
	return h(
		"li",
		{ class: `count count--${state}` },
		h("span", { class: "count__label" }, row.label, h("span", { class: "count__hint" }, row.hint)),
		h(
			"span",
			{ class: "count__value" },
			String(row.value),
			h("span", { class: "count__limit" }, off ? "no limit" : `limit ${row.limit}`),
		),
	);
}
