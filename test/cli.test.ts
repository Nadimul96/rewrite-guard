import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type CliIo, run, VERSION } from "../src/cli/main.js";

function fakeIo(files: Record<string, string>) {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = {
		stdout: (text) => out.push(text),
		stderr: (text) => err.push(text),
		readFile: (path) => {
			const content = files[path];
			if (content === undefined) throw new Error(`ENOENT: no such file, open '${path}'`);
			return content;
		},
		color: false,
	};
	return { io, out: () => out.join(""), err: () => err.join("") };
}

const files = {
	"source.txt": "The courier did not sign for the 3 parcels at the depot on Monday morning.",
	"good.txt": "The courier didn’t sign for the three parcels at the depot on Monday morning.",
	"bad.txt": "The courier signed for the 4 parcels at the depot in Leeds on Monday morning.",
	"script.txt": "Hello there, big wide world.",
	"words.json": JSON.stringify({
		words: [
			{ word: "hello", start: 0, end: 0.4 },
			{ word: "big", start: 0.9, end: 1.1 },
			{ word: "wide", start: 1.15, end: 1.4 },
			{ word: "world", start: 1.45, end: 1.8 },
		],
	}),
};

describe("cli", () => {
	it("prints a readable report and exits 1 for an unfaithful rewrite", () => {
		const { io, out } = fakeIo(files);
		expect(run(["check", "source.txt", "bad.txt"], io)).toBe(1);
		expect(out()).toMatch(/^FAIL/);
		expect(out()).toContain('"Leeds"');
		expect(out()).toMatch(/drops "not"/);
	});

	it("prints JSON with line and column positions", () => {
		const { io, out } = fakeIo(files);
		expect(run(["check", "source.txt", "bad.txt", "--json"], io)).toBe(1);
		const report = JSON.parse(out());
		expect(report.passes).toBe(false);
		expect(report.novel.map((token: { text: string }) => token.text)).toEqual(
			expect.arrayContaining(["4", "Leeds"]),
		);
		expect(report.missing[0]).toMatchObject({ line: 1 });
		expect(report.profile.name).toBe("normal");
	});

	it("exits 0 and prints nothing in quiet mode when the rewrite passes", () => {
		const { io, out } = fakeIo(files);
		expect(run(["check", "source.txt", "good.txt", "--no-payoff", "--quiet"], io)).toBe(0);
		expect(out()).toBe("");
	});

	it("aligns a transcript and reports interpolated words", () => {
		const { io, out } = fakeIo(files);
		expect(run(["align", "script.txt", "words.json", "--duration", "2"], io)).toBe(0);
		expect(out()).toContain("there,");
		expect(out()).toContain("interpolated");
	});

	it("exits 2 with a clear message on usage and input errors", () => {
		const missing = fakeIo(files);
		expect(run(["check", "source.txt"], missing.io)).toBe(2);
		expect(missing.err()).toMatch(/expected <source> and <rewrite>/);

		const unknown = fakeIo(files);
		expect(run(["check", "source.txt", "nope.txt"], unknown.io)).toBe(2);
		expect(unknown.err()).toMatch(/ENOENT/);

		const badProfile = fakeIo(files);
		expect(run(["check", "source.txt", "good.txt", "--profile", "huge"], badProfile.io)).toBe(2);

		expect(run(["frobnicate"], fakeIo(files).io)).toBe(2);
	});

	it("prints help and a version that matches package.json", () => {
		const help = fakeIo(files);
		expect(run(["--help"], help.io)).toBe(0);
		expect(help.out()).toContain("rewrite-fidelity check <source> <rewrite>");
		const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
		expect(VERSION).toBe(pkg.version);
	});
});
