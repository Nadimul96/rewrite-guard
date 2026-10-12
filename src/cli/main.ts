#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkFidelity, type FidelityOptions } from "../check.js";
import type { ProfileName } from "../profiles.js";
import { alignTranscript, type TimedWord } from "../transcript.js";
import { COLOR, formatAlignment, formatReport, PLAIN, reportToJson } from "./format.js";

export const VERSION = "0.1.0";

const HELP = `rewrite-guard ${VERSION}
Deterministic checks that catch a rewrite dropping, reordering or inventing facts.

Usage
  rewrite-guard check <source> <rewrite> [options]
  rewrite-guard align <script> <words.json> [--duration <seconds>] [--json]

Files may be "-" to read from stdin (one of them at most).

check options
  --json               print a machine-readable report
  --profile <name>     very_short | short | normal (default: chosen by length)
  --evidence <file>    text whose words the rewrite may add; repeatable
  --no-payoff          do not require the ending of the source to survive
  --quiet              print nothing; use the exit code

align options
  --duration <s>       decoded audio length in seconds
  --json               print the aligned words as JSON

Exit codes
  0  the rewrite passes (or the transcript aligned)
  1  the rewrite fails (or the alignment failed honestly)
  2  usage or input error
`;

export interface CliIo {
	readonly stdout: (text: string) => void;
	readonly stderr: (text: string) => void;
	readonly readFile: (path: string) => string;
	readonly color: boolean;
}

const PROFILE_NAMES = new Set<ProfileName>(["very_short", "short", "normal"]);

class UsageError extends Error {}

export function run(argv: readonly string[], io: CliIo): number {
	try {
		return dispatch(argv, io);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		io.stderr(`error: ${message}\n${error instanceof UsageError ? "Run with --help for usage.\n" : ""}`);
		return 2;
	}
}

function dispatch(argv: readonly string[], io: CliIo): number {
	const [command, ...rest] = argv;
	if (command === undefined || command === "--help" || command === "-h" || command === "help") {
		io.stdout(HELP);
		return command === undefined ? 2 : 0;
	}
	if (command === "--version" || command === "-v") {
		io.stdout(`${VERSION}\n`);
		return 0;
	}
	if (command === "check") return runCheck(rest, io);
	if (command === "align") return runAlign(rest, io);
	throw new UsageError(`unknown command "${command}"`);
}

function runCheck(argv: readonly string[], io: CliIo): number {
	const { values, positionals } = parse(argv, {
		json: { type: "boolean" },
		profile: { type: "string" },
		evidence: { type: "string", multiple: true },
		"no-payoff": { type: "boolean" },
		quiet: { type: "boolean" },
	});
	const [sourcePath, rewritePath] = expectFiles(positionals, ["source", "rewrite"]);
	const profile = values.profile;
	if (typeof profile === "string" && !PROFILE_NAMES.has(profile as ProfileName)) {
		throw new UsageError(`--profile must be one of ${[...PROFILE_NAMES].join(", ")}`);
	}

	const source = io.readFile(sourcePath);
	const rewrite = io.readFile(rewritePath);
	const evidence = Array.isArray(values.evidence)
		? values.evidence.map((path) => io.readFile(String(path)))
		: [];
	const options: FidelityOptions = {
		allowedEvidence: evidence,
		requirePayoff: values["no-payoff"] !== true,
		...(typeof profile === "string" ? { profile: profile as ProfileName } : {}),
	};
	const report = checkFidelity(source, rewrite, options);

	if (values.json === true) {
		io.stdout(`${JSON.stringify(reportToJson(report, source, rewrite), null, 2)}\n`);
	} else if (values.quiet !== true) {
		io.stdout(`${formatReport(report, source, rewrite, io.color ? COLOR : PLAIN)}\n`);
	}
	return report.passes ? 0 : 1;
}

function runAlign(argv: readonly string[], io: CliIo): number {
	const { values, positionals } = parse(argv, {
		json: { type: "boolean" },
		duration: { type: "string" },
	});
	const [scriptPath, wordsPath] = expectFiles(positionals, ["script", "words.json"]);
	const script = io.readFile(scriptPath);
	const words = parseTimedWords(io.readFile(wordsPath));
	const duration = typeof values.duration === "string" ? Number(values.duration) : undefined;
	if (duration !== undefined && !Number.isFinite(duration)) {
		throw new UsageError("--duration must be a number of seconds");
	}

	const result = alignTranscript(script, words, duration === undefined ? {} : { audioDuration: duration });
	if (values.json === true) {
		io.stdout(`${JSON.stringify(result, null, 2)}\n`);
	} else {
		io.stdout(`${formatAlignment(result, io.color ? COLOR : PLAIN)}\n`);
	}
	return result.ok ? 0 : 1;
}

type OptionSpec = Record<string, { type: "boolean" | "string"; multiple?: boolean }>;

function parse(argv: readonly string[], options: OptionSpec) {
	try {
		return parseArgs({ args: [...argv], options, allowPositionals: true, strict: true });
	} catch (error) {
		throw new UsageError(error instanceof Error ? error.message : String(error));
	}
}

function expectFiles(positionals: readonly string[], names: readonly [string, string]): [string, string] {
	const [first, second, ...extra] = positionals;
	if (first === undefined || second === undefined || extra.length > 0) {
		throw new UsageError(`expected <${names[0]}> and <${names[1]}>`);
	}
	if (first === "-" && second === "-") throw new UsageError("only one input can come from stdin");
	return [first, second];
}

/**
 * Accepts `[{ text|word, start, end }]` or `{ words: [...] }`, the two shapes
 * most speech-to-text APIs return.
 */
function parseTimedWords(json: string): TimedWord[] {
	let value: unknown;
	try {
		value = JSON.parse(json);
	} catch {
		throw new Error("words file is not valid JSON");
	}
	const list = Array.isArray(value) ? value : (value as { words?: unknown } | null)?.words;
	if (!Array.isArray(list)) throw new Error("words file must be an array or an object with a words array");
	return list.map((item, index) => {
		const entry = (item ?? {}) as Record<string, unknown>;
		const text = entry.text ?? entry.word;
		if (typeof text !== "string") throw new Error(`word ${index} has no text`);
		return { text, start: Number(entry.start), end: Number(entry.end) };
	});
}

function nodeIo(): CliIo {
	return {
		stdout: (text) => process.stdout.write(text),
		stderr: (text) => process.stderr.write(text),
		readFile: (path) => readFileSync(path === "-" ? 0 : path, "utf8"),
		color: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR,
	};
}

function isEntryPoint() {
	const invoked = process.argv[1];
	if (!invoked) return false;
	try {
		return realpathSync(invoked) === realpathSync(fileURLToPath(import.meta.url));
	} catch {
		return false;
	}
}

if (isEntryPoint()) {
	process.exitCode = run(process.argv.slice(2), nodeIo());
}
