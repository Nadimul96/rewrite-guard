/**
 * `pnpm demo`: run the CLI on the bundled examples so the idea is visible in
 * one command, with no keys, network or build step.
 */
import { readFileSync } from "node:fs";
import { run } from "../src/cli/main.js";

const io = {
	stdout: (text: string) => process.stdout.write(text),
	stderr: (text: string) => process.stderr.write(text),
	readFile: (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
	color: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR,
};

const steps: Array<[string, string[]]> = [
	[
		"A faithful cleanup of an incident note",
		["check", "examples/incident.source.txt", "examples/incident.faithful.txt"],
	],
	[
		"An unfaithful rewrite: invented place, changed number, dropped negation, dropped clause",
		["check", "examples/incident.source.txt", "examples/incident.unfaithful.txt"],
	],
	[
		"Forced alignment: put ASR timestamps on the exact script words",
		["align", "examples/narration.script.txt", "examples/narration.words.json", "--duration", "4.9"],
	],
];

for (const [title, argv] of steps) {
	process.stdout.write(`\n=== ${title}\n$ rewrite-fidelity ${argv.join(" ")}\n\n`);
	const code = run(argv, io);
	process.stdout.write(`\n(exit code ${code})\n`);
}
