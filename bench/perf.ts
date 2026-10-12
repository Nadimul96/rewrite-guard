/**
 * `pnpm bench:perf`: wall-clock timings on this machine (medians of several
 * runs). Not deterministic, so the output (bench/results/perf.json) records
 * the machine and date and is not checked in CI.
 */
import { writeFileSync } from "node:fs";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { checkFidelity } from "../src/check.js";
import { DOCUMENTS } from "./corpus/index.js";
import { buildDataset } from "./dataset.js";
import { seeded } from "./rng.js";

const OUTPUT = new URL("./results/perf.json", import.meta.url);

/** Median wall-clock time of `repeat` runs after one warm-up run. */
function time<T>(run: () => T, repeat = 5): { ms: number; result: T } {
	let result = run();
	const samples: number[] = [];
	for (let index = 0; index < repeat; index += 1) {
		const started = performance.now();
		result = run();
		samples.push(performance.now() - started);
	}
	samples.sort((left, right) => left - right);
	return { ms: samples[Math.floor(samples.length / 2)] as number, result };
}

/** A long synthetic document built from corpus words, plus a copy with scattered edits. */
function longPair(words: number, edits: number) {
	const vocabulary = DOCUMENTS.flatMap((document) => document.sentences.join(" ").split(/\s+/));
	const rng = seeded(`perf:${words}`);
	const source = Array.from(
		{ length: words },
		() => vocabulary[Math.floor(rng() * vocabulary.length)] as string,
	);
	const rewrite = [...source];
	for (let edit = 0; edit < edits; edit += 1) {
		rewrite[Math.floor(rng() * rewrite.length)] = "edited";
	}
	return { source: source.join(" "), rewrite: rewrite.join(" ") };
}

const { pairs } = buildDataset();
const corpus = time(() => {
	for (const pair of pairs) checkFidelity(pair.source, pair.rewrite);
}, 7);

const scaling = [1_000, 5_000, 10_000, 20_000].map((words) => {
	const scattered = longPair(words, 20);
	const local = longPair(words, 0);
	const localRewrite = local.rewrite.replace(/(\S+\s+){10}/, "");
	const scatteredRun = time(() => checkFidelity(scattered.source, scattered.rewrite), words > 10_000 ? 3 : 5);
	const localRun = time(() => checkFidelity(local.source, localRewrite));
	return {
		words,
		scatteredEditsMs: round(scatteredRun.ms),
		oneLocalEditMs: round(localRun.ms),
		tokens: scatteredRun.result.counts.sourceTokens,
	};
});

const identity = longPair(70_000, 0);
const identityRun = time(() => checkFidelity(identity.source, identity.rewrite));

const results = {
	measuredOn: new Date().toISOString().slice(0, 10),
	machine: `${cpus()[0]?.model ?? "unknown CPU"}, ${Math.round(totalmem() / 2 ** 30)} GB, ${platform()} ${release()} ${arch()}, Node ${process.version}`,
	corpus: {
		pairs: pairs.length,
		totalMs: round(corpus.ms),
		checksPerSecond: Math.round(pairs.length / (corpus.ms / 1000)),
	},
	scaling,
	identity70kTokens: {
		ms: round(identityRun.ms),
		matchedInOrder: identityRun.result.counts.matchedInOrder,
	},
};

writeFileSync(OUTPUT, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));

function round(value: number) {
	return Math.round(value * 100) / 100;
}
