import results from "../../../bench/results/benchmark.json";
import { h } from "../dom.js";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

interface TypeRow {
	type: string;
	label: string;
	description: string;
	n: number;
	flaggedRate: number;
}

/** Hero stats and the per-perturbation table, read from the committed benchmark results. */
export function renderBenchmark(stats: HTMLElement, lede: HTMLElement, table: HTMLElement) {
	const test = results.results.calibrated.test;
	const hand = results.results.handSet.test;
	stats.replaceChildren(
		h("li", {}, h("strong", {}, test.f1.toFixed(3)), " F1 on held-out pairs"),
		h("li", {}, h("strong", {}, percent(test.falsePositiveRate)), " false alarms"),
		h("li", {}, h("strong", {}, "0"), " runtime dependencies"),
	);
	lede.textContent = `${test.n.toLocaleString("en-US")} held-out labeled pairs from stories, fables, notices and phrases. Calibrated thresholds: precision ${percent(test.precision)}, recall ${percent(test.recall)}, F1 ${test.f1.toFixed(3)}. The original hand-set thresholds scored F1 ${hand.f1.toFixed(3)} with ${percent(hand.falsePositiveRate)} false alarms. Reproduce with pnpm bench.`;

	const rows = results.results.calibrated.testByType as TypeRow[];
	table.replaceChildren(
		h(
			"thead",
			{},
			h(
				"tr",
				{},
				h("th", { scope: "col" }, "Perturbation"),
				h("th", { scope: "col" }, "Pairs"),
				h("th", { scope: "col" }, "Flagged"),
				h("th", { scope: "col", class: "benchmark__bar-col" }, ""),
			),
		),
		h(
			"tbody",
			{},
			...rows.map((row) => {
				const unfaithful = row.label === "unfaithful";
				const good = unfaithful ? row.flaggedRate >= 0.95 : row.flaggedRate <= 0.05;
				const bar = h("span", { class: "bar__fill" });
				bar.style.width = `${row.flaggedRate * 100}%`;
				return h(
					"tr",
					{},
					h(
						"th",
						{ scope: "row" },
						h("span", { class: `dot dot--${row.label}` }),
						row.description,
						h("span", { class: "benchmark__kind" }, unfaithful ? "should flag" : "should pass"),
					),
					h("td", {}, String(row.n)),
					h("td", { class: good ? "is-good" : "is-bad" }, percent(row.flaggedRate)),
					h("td", { class: "benchmark__bar-col" }, h("span", { class: `bar bar--${row.label}` }, bar)),
				);
			}),
		),
	);
}
