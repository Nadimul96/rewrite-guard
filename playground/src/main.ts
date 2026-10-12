import "./styles.css";
import { checkFidelity, type FidelityOptions, type FidelityReport } from "../../src/check.js";
import type { ProfileName } from "../../src/profiles.js";
import { tokenize } from "../../src/tokenize.js";
import { byId, h } from "./dom.js";
import { buildExamples, type Example } from "./examples.js";
import { renderBenchmark } from "./render/benchmark.js";
import { renderChecks } from "./render/checks.js";
import { linkMovedTokens, renderDiff } from "./render/diff.js";
import { renderVerdict } from "./render/verdict.js";
import { initTheme } from "./theme.js";

const source = byId<HTMLTextAreaElement>("source");
const rewrite = byId<HTMLTextAreaElement>("rewrite");
const evidence = byId<HTMLTextAreaElement>("evidence");
const profile = byId<HTMLSelectElement>("profile");
const strict = byId<HTMLInputElement>("strict");
const examplesList = byId("examples");

const examples = buildExamples();
let activeExample: Example | null = null;

function options(): FidelityOptions {
	const chosen = profile.value;
	return {
		...(chosen === "auto" ? {} : { profile: chosen as ProfileName }),
		...(strict.checked ? { thresholds: { maxMovedRun: 0 } } : {}),
		...(evidence.value.trim() ? { allowedEvidence: [evidence.value] } : {}),
	};
}

function update() {
	byId("source-count").textContent = countLabel(source.value);
	byId("rewrite-count").textContent = countLabel(rewrite.value);
	let report: FidelityReport | null = null;
	if (!source.value.trim() && !rewrite.value.trim()) {
		renderVerdict(byId("verdict"), { kind: "empty" });
	} else {
		try {
			report = checkFidelity(source.value, rewrite.value, options());
			renderVerdict(byId("verdict"), { kind: "report", report, example: activeExample });
		} catch (error) {
			renderVerdict(byId("verdict"), {
				kind: "error",
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}
	renderChecks(byId("checks"), report);
	renderDiff(byId("source-view"), byId("rewrite-view"), report, source.value, rewrite.value);
	for (const textarea of [source, rewrite]) autosize(textarea);
}

function countLabel(text: string) {
	const count = tokenize(text).length;
	return `${count.toLocaleString("en-US")} ${count === 1 ? "token" : "tokens"}`;
}

function autosize(textarea: HTMLTextAreaElement) {
	textarea.style.height = "auto";
	textarea.style.height = `${Math.min(textarea.scrollHeight + 2, 420)}px`;
}

function loadExample(example: Example) {
	activeExample = example;
	source.value = example.source;
	rewrite.value = example.rewrite;
	for (const button of examplesList.querySelectorAll("button")) {
		button.setAttribute("aria-pressed", String(button.dataset.example === example.id));
	}
	update();
}

let pending = 0;
function scheduleUpdate() {
	activeExample = null;
	for (const button of examplesList.querySelectorAll("button")) button.setAttribute("aria-pressed", "false");
	window.clearTimeout(pending);
	pending = window.setTimeout(update, 120);
}

examplesList.replaceChildren(
	...examples.map((example) => {
		const button = h(
			"button",
			{
				type: "button",
				class: "example",
				"data-example": example.id,
				"aria-pressed": "false",
				title: example.note,
			},
			h("span", { class: `dot dot--${example.expected}`, "aria-hidden": "true" }),
			example.label,
			example.limitation ? h("span", { class: "example__tag" }, "limit") : null,
		);
		button.addEventListener("click", () => loadExample(example));
		return button;
	}),
);

for (const input of [source, rewrite, evidence]) input.addEventListener("input", scheduleUpdate);
for (const control of [profile, strict]) control.addEventListener("change", update);
linkMovedTokens(document.body);
initTheme(byId("theme-toggle"));
renderBenchmark(byId("hero-stats"), byId("benchmark-lede"), byId("benchmark-table"));

// "#example=<perturbation>" opens a specific example, so a link can point at one.
const requested = new URLSearchParams(window.location.hash.slice(1)).get("example");
const first =
	examples.find((example) => example.id === requested) ??
	examples.find((example) => example.id === "insert_place") ??
	examples[0];
if (first) loadExample(first);
else update();
