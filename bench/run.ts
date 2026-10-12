/**
 * `pnpm bench`: build the adversarial dataset, calibrate the thresholds on
 * one half, measure both the hand-set and the calibrated thresholds on the
 * other half, and write bench/results/benchmark.json plus the README table.
 *
 * `pnpm bench:check` recomputes everything and fails if the committed
 * results, the README table or the shipped profiles have drifted.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { checkFidelity } from "../src/check.js";
import { PROFILES, profileByName, type ThresholdProfile, type Thresholds } from "../src/profiles.js";
import { HAND_SET_PROFILES } from "./baseline.js";
import { calibrate, featuresOf, flagged, type Sample } from "./calibrate.js";
import { DOCUMENTS } from "./corpus/index.js";
import { PHRASES } from "./corpus/phrases.js";
import { buildDataset, type LabeledPair } from "./dataset.js";
import { byProfile, byType, evaluate, inSplit, type Outcome, scoreOf } from "./evaluate.js";
import { type BenchmarkResults, benchmarkMarkdown, type ResultSet } from "./report.js";

const RESULTS_PATH = new URL("./results/benchmark.json", import.meta.url);
const README_PATH = new URL("../README.md", import.meta.url);
const START = "<!-- benchmark:start -->";
const END = "<!-- benchmark:end -->";
const CALIBRATED = ["short", "normal"] as const;

/**
 * The objective: type-balanced F1, with each surface-only edit kept under a
 * 10% false-alarm rate. Hand-written paraphrases change vocabulary, which a
 * lexical checker cannot accept, so they count in F1 but are not capped.
 */
const OBJECTIVE = {
	constrainedTypes: new Set(["punctuation_casing", "filler_removal", "light_paraphrase", "move_adverbial"]),
	maxFalseAlarm: 0.1,
};

function main() {
	const check = process.argv.includes("--check");
	const { pairs, discarded } = buildDataset();

	const calibratedProfiles: ThresholdProfile[] = [...PROFILES];
	const calibrationF1 = {} as Record<(typeof CALIBRATED)[number], number>;
	const plateaus = {} as BenchmarkResults["thresholds"]["plateaus"];
	const calibrated = {} as Record<(typeof CALIBRATED)[number], Thresholds>;
	for (const name of CALIBRATED) {
		const samples = samplesFor(pairs, name);
		const result = calibrate(samples, OBJECTIVE);
		calibrated[name] = result.thresholds;
		calibrationF1[name] = Math.round(result.f1 * 10_000) / 10_000;
		plateaus[name] = result.plateaus;
		const index = calibratedProfiles.findIndex((profile) => profile.name === name);
		calibratedProfiles[index] = { ...(calibratedProfiles[index] as ThresholdProfile), ...result.thresholds };
	}

	// The strict variant: the calibrated profile with any moved word failing.
	const strictProfiles = calibratedProfiles.map((profile) =>
		profile.name === "short" || profile.name === "normal" ? { ...profile, maxMovedRun: 0 } : profile,
	);
	const handOutcomes = evaluate(pairs, HAND_SET_PROFILES);
	const calibratedOutcomes = evaluate(pairs, calibratedProfiles);
	const strictOutcomes = evaluate(pairs, strictProfiles);
	assertFastPathAgrees(pairs, calibratedProfiles, calibratedOutcomes);

	const results: BenchmarkResults = {
		corpus: corpusSummary(pairs, discarded.length),
		objective: {
			description: "type-balanced F1 on the calibration half",
			cappedTypes: [...OBJECTIVE.constrainedTypes],
			maxFalseAlarm: OBJECTIVE.maxFalseAlarm,
		},
		thresholds: {
			handSet: {
				short: thresholdsOf(profileByName("short", HAND_SET_PROFILES)),
				normal: thresholdsOf(profileByName("normal", HAND_SET_PROFILES)),
			},
			calibrated,
			calibrationF1,
			plateaus,
		},
		results: {
			handSet: resultSet(handOutcomes),
			calibrated: resultSet(calibratedOutcomes),
			strict: resultSet(strictOutcomes),
		},
	};

	const json = `${JSON.stringify(results, (_, value) => (value === Number.POSITIVE_INFINITY ? null : value), 2)}\n`;
	const readme = existsSync(README_PATH) ? readFileSync(README_PATH, "utf8") : "";
	const section = `${START}\n${benchmarkMarkdown(results)}\n${END}`;
	const updatedReadme = readme.includes(START)
		? readme.replace(new RegExp(`${START}[\\s\\S]*?${END}`), section)
		: readme;
	const shippedDrift = CALIBRATED.filter(
		(name) => JSON.stringify(thresholdsOf(profileByName(name))) !== JSON.stringify(calibrated[name]),
	);

	if (check) {
		const problems = [
			readFileSync(RESULTS_PATH, "utf8") === json ? "" : "bench/results/benchmark.json is out of date",
			updatedReadme === readme ? "" : "the README benchmark table is out of date",
			...shippedDrift.map((name) => `src/profiles.ts "${name}" differs from the calibrated thresholds`),
		].filter(Boolean);
		if (problems.length > 0) {
			console.error(
				`Benchmark drift:\n- ${problems.join("\n- ")}\nRun \`pnpm bench\` and commit the result.`,
			);
			process.exitCode = 1;
			return;
		}
		console.log(`Benchmark is up to date (${pairs.length} pairs).`);
		return;
	}

	writeFileSync(RESULTS_PATH, json);
	if (updatedReadme !== readme) writeFileSync(README_PATH, updatedReadme);
	console.log(benchmarkMarkdown(results));
	for (const name of shippedDrift) {
		console.warn(`\nsrc/profiles.ts "${name}" should be: ${JSON.stringify(calibrated[name])}`);
	}
}

function samplesFor(pairs: readonly LabeledPair[], profile: "short" | "normal"): Sample[] {
	return pairs
		.filter((pair) => pair.split === "calibration")
		.map((pair) => ({ pair, report: checkFidelity(pair.source, pair.rewrite) }))
		.filter(({ report }) => report.profile.name === profile)
		.map(({ pair, report }) => ({
			features: featuresOf(report),
			unfaithful: pair.label === "unfaithful",
			type: pair.type,
		}));
}

/** The calibration loop decides from features; prove it matches the real check. */
function assertFastPathAgrees(
	pairs: readonly LabeledPair[],
	profiles: readonly ThresholdProfile[],
	outcomes: readonly Outcome[],
) {
	pairs.forEach((pair, index) => {
		const report = checkFidelity(pair.source, pair.rewrite, { profiles });
		if (flagged(featuresOf(report), report.profile) !== (outcomes[index] as Outcome).flagged) {
			throw new Error(`Calibration decision disagrees with checkFidelity on ${pair.id}`);
		}
	});
}

function resultSet(outcomes: readonly Outcome[]): ResultSet {
	const test = outcomes.filter(inSplit("test"));
	return {
		calibration: scoreOf(outcomes.filter(inSplit("calibration"))),
		test: scoreOf(test),
		testByProfile: byProfile(test),
		testByType: byType(test),
	};
}

function corpusSummary(pairs: readonly LabeledPair[], discarded: number): BenchmarkResults["corpus"] {
	const count = <T extends string>(values: readonly T[]) =>
		values.reduce<Record<string, number>>((totals, value) => {
			totals[value] = (totals[value] ?? 0) + 1;
			return totals;
		}, {});
	const units = new Map(pairs.map((pair) => [pair.unitId, pair.level]));
	return {
		documents: count(DOCUMENTS.map((document) => document.kind)),
		phrases: Object.keys(PHRASES).length,
		units: count([...units.values()]),
		pairs: pairs.length,
		faithful: pairs.filter((pair) => pair.label === "faithful").length,
		unfaithful: pairs.filter((pair) => pair.label === "unfaithful").length,
		discarded,
		split: {
			calibration: pairs.filter((pair) => pair.split === "calibration").length,
			test: pairs.filter((pair) => pair.split === "test").length,
		},
	};
}

function thresholdsOf(profile: ThresholdProfile): Thresholds {
	const { ordered, lexical, orderRetention, payoff, maxMissingRun, maxMovedRun } = profile;
	return { ordered, lexical, orderRetention, payoff, maxMissingRun, maxMovedRun };
}

main();
