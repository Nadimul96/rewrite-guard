import type { FidelityReport, TokenRef } from "../../../src/check.js";
import { h } from "../dom.js";

type Status = "missing" | "moved" | "novel" | "protected" | "extra";

// When a contraction expands into two tokens sharing one surface word, the
// most important status wins.
const PRIORITY: Record<Status, number> = { protected: 5, novel: 4, missing: 3, moved: 2, extra: 1 };

interface Mark {
	status: Status;
	link?: string;
	title: string;
}

/** Render both texts with their tokens marked, preserving the original characters. */
export function renderDiff(
	sourceView: HTMLElement,
	rewriteView: HTMLElement,
	report: FidelityReport | null,
	source: string,
	rewrite: string,
) {
	if (!report) {
		sourceView.replaceChildren(h("span", { class: "muted" }, "Nothing to compare yet."));
		rewriteView.replaceChildren(h("span", { class: "muted" }, "Nothing to compare yet."));
		return;
	}
	const sourceMarks = new Map<number, Mark>();
	const rewriteMarks = new Map<number, Mark>();
	const protectedSource = new Set(
		[...report.negations.dropped, ...report.numbers.dropped].map((token) => token.index),
	);

	for (const token of report.missing) {
		mark(sourceMarks, token, {
			status: protectedSource.has(token.index) ? "protected" : "missing",
			title: protectedSource.has(token.index)
				? `Missing ${kindOf(token, report)}`
				: "Missing from the rewrite",
		});
	}
	report.moved.forEach((pair, index) => {
		const link = `m${index}`;
		mark(sourceMarks, pair.source, { status: "moved", link, title: "Present in the rewrite, out of order" });
		mark(rewriteMarks, pair.rewrite, { status: "moved", link, title: "Comes from elsewhere in the source" });
	});
	for (const token of report.novel)
		mark(rewriteMarks, token, { status: "novel", title: "Not supported by the source" });
	for (const token of report.negations.added)
		mark(rewriteMarks, token, { status: "protected", title: "Added negation" });
	const aligned = new Set(report.alignment.map(([, j]) => j));
	const movedRewrite = new Set(report.moved.map((pair) => pair.rewrite.index));
	for (const token of report.rewriteTokens) {
		if (!aligned.has(token.index) && !movedRewrite.has(token.index)) {
			mark(rewriteMarks, token, { status: "extra", title: "Added function word" });
		}
	}

	sourceView.replaceChildren(...paint(source, report.sourceTokens, sourceMarks));
	rewriteView.replaceChildren(...paint(rewrite, report.rewriteTokens, rewriteMarks));
}

function kindOf(token: TokenRef, report: FidelityReport) {
	return report.numbers.dropped.includes(token) ? "number" : "negation";
}

function mark(marks: Map<number, Mark>, token: TokenRef, next: Mark) {
	const current = marks.get(token.index);
	if (!current || PRIORITY[next.status] > PRIORITY[current.status]) marks.set(token.index, next);
}

function paint(text: string, tokens: readonly TokenRef[], marks: Map<number, Mark>): Node[] {
	// Collapse tokens that share a surface span (contractions) into one mark.
	const spans = new Map<number, { start: number; end: number; mark: Mark | undefined }>();
	for (const token of tokens) {
		const existing = spans.get(token.start);
		const tokenMark = marks.get(token.index);
		if (!existing) {
			spans.set(token.start, { start: token.start, end: token.end, mark: tokenMark });
		} else if (tokenMark && (!existing.mark || PRIORITY[tokenMark.status] > PRIORITY[existing.mark.status])) {
			existing.mark = tokenMark;
		}
	}
	const nodes: Node[] = [];
	let cursor = 0;
	for (const span of [...spans.values()].sort((left, right) => left.start - right.start)) {
		if (!span.mark) continue;
		if (span.start > cursor) nodes.push(document.createTextNode(text.slice(cursor, span.start)));
		const element = h(
			"mark",
			{ class: `tok tok--${span.mark.status}`, title: span.mark.title, "data-link": span.mark.link },
			text.slice(span.start, span.end),
		);
		nodes.push(element);
		cursor = span.end;
	}
	if (cursor < text.length) nodes.push(document.createTextNode(text.slice(cursor)));
	return nodes;
}

/** Hovering a moved word lights up its counterpart in the other pane. */
export function linkMovedTokens(root: HTMLElement) {
	const toggle = (event: Event, on: boolean) => {
		const target = event.target as HTMLElement | null;
		const link = target?.dataset?.link;
		if (!link) return;
		for (const element of root.querySelectorAll(`[data-link="${link}"]`)) {
			element.classList.toggle("tok--linked", on);
		}
	};
	root.addEventListener("mouseover", (event) => toggle(event, true));
	root.addEventListener("mouseout", (event) => toggle(event, false));
}
