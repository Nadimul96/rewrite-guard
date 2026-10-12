import type { FailureCode, FidelityReport } from "../../../src/check.js";
import { h, icon } from "../dom.js";
import type { Example } from "../examples.js";

const PROFILE_LABELS: Record<string, string> = {
	empty: "empty",
	very_short: "very short",
	short: "short",
	normal: "normal",
};

const SUMMARY: Record<FailureCode, string> = {
	ordered_coverage: "too little survives in order",
	lexical_coverage: "too much of the source is gone",
	order_retention: "the order changed",
	payoff: "the ending did not survive",
	dropped_span: "content was dropped",
	moved_span: "a block of text moved",
	novel_tokens: "words were invented",
	negation: "a negation changed",
	number: "a number was lost",
	unexpected_content: "the source has no words",
};

export type VerdictState =
	| { kind: "empty" }
	| { kind: "error"; message: string }
	| { kind: "report"; report: FidelityReport; example: Example | null };

export function renderVerdict(container: HTMLElement, state: VerdictState): void {
	container.replaceChildren(...verdictContent(state));
	container.dataset.state = state.kind === "report" ? (state.report.passes ? "pass" : "fail") : state.kind;
}

function verdictContent(state: VerdictState): Node[] {
	if (state.kind === "empty") {
		return [
			h("p", { class: "verdict__eyebrow" }, "Verdict"),
			h("p", { class: "verdict__title verdict__title--muted" }, "Waiting for text"),
			h("p", { class: "verdict__summary" }, "Paste a source and a rewrite, or pick an example above."),
		];
	}
	if (state.kind === "error") {
		return [
			h("p", { class: "verdict__eyebrow" }, "Verdict"),
			h("p", { class: "verdict__title verdict__title--muted" }, icon("alert"), "Could not check"),
			h("p", { class: "verdict__summary" }, state.message),
		];
	}

	const { report, example } = state;
	const reasons = [...new Set(report.failures.map((failure) => SUMMARY[failure.code]))];
	const summary = report.passes
		? "Every content word survived, nothing was invented, and no negation or number changed."
		: `${capitalize(reasons.slice(0, 3).join(", "))}.`;
	const nodes: Node[] = [
		h(
			"div",
			{ class: "verdict__top" },
			h("p", { class: "verdict__eyebrow" }, "Verdict"),
			h(
				"span",
				{ class: "chip" },
				`${PROFILE_LABELS[report.profile.name] ?? report.profile.name} profile · ${report.counts.sourceTokens} tokens`,
			),
		),
		h(
			"p",
			{ class: "verdict__title" },
			icon(report.passes ? "check" : "cross"),
			report.passes ? "Faithful" : "Unfaithful",
		),
		h("p", { class: "verdict__summary" }, summary),
	];
	if (report.failures.length > 0) {
		nodes.push(
			h("ul", { class: "reasons" }, ...report.failures.map((failure) => h("li", {}, failure.message))),
		);
	}
	if (example) {
		const matches = (example.expected === "faithful") === report.passes;
		nodes.push(
			h(
				"div",
				{ class: `example-note ${example.limitation ? "example-note--limit" : ""}` },
				icon(example.limitation ? "info" : matches ? "check" : "alert"),
				h(
					"p",
					{},
					h("strong", {}, `Benchmark label: ${example.expected}. `),
					example.note,
					example.limitation ? ` ${example.limitation}` : "",
				),
			),
		);
	}
	return nodes;
}

function capitalize(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
