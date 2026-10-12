import { describe, expect, it } from "vitest";
import { english, type Locale } from "../src/locale.js";
import { tokenize, tokenNorms } from "../src/tokenize.js";

describe("tokenize", () => {
	it("normalizes punctuation, contractions and hesitation fillers", () => {
		expect(tokenNorms("Um, I couldn't—uh—believe it, you know? But I wasn't leaving!")).toEqual([
			"i",
			"could",
			"not",
			"believe",
			"it",
			"but",
			"i",
			"was",
			"not",
			"leaving",
		]);
	});

	it("keeps 'you know' and 'I mean' when they carry meaning", () => {
		expect(tokenNorms("You know him and I mean it.")).toEqual([
			"you",
			"know",
			"him",
			"and",
			"i",
			"mean",
			"it",
		]);
	});

	it("drops discourse markers, and 'so' only at the start of a clause", () => {
		expect(tokenNorms("Um, so I basically walked in. So it goes.")).toEqual([
			"i",
			"walked",
			"in",
			"it",
			"goes",
		]);
		expect(tokenNorms("I was tired, so I left")).toEqual(["i", "was", "tired", "so", "i", "left"]);
	});

	it("maps number words to digits and drops thousands separators", () => {
		expect(tokenNorms("Three trains left at 9:30 carrying 3,000 people, 4.5 tons each.")).toEqual([
			"3",
			"trains",
			"left",
			"at",
			"9:30",
			"carrying",
			"3000",
			"people",
			"4.5",
			"tons",
			"each",
		]);
	});

	it("strips possessives and folds curly quotes and case", () => {
		expect(tokenNorms("Casey’s CAT didn’t move")).toEqual(["casey", "cat", "did", "not", "move"]);
	});

	it("records the surface span of every token, shared by contraction parts", () => {
		const text = "Maya didn't call.";
		const tokens = tokenize(text);
		expect(tokens.map((token) => text.slice(token.start, token.end))).toEqual([
			"Maya",
			"didn't",
			"didn't",
			"call",
		]);
		expect(tokens.map((token) => token.index)).toEqual([0, 1, 2, 3]);
	});

	it("handles non-Latin scripts without dropping words", () => {
		expect(tokenNorms("Ünïcödé café 東京 2026")).toEqual(["ünïcödé", "café", "東京", "2026"]);
	});

	it("takes its tables from a pluggable locale", () => {
		const spanishish: Locale = {
			...english,
			id: "es",
			fillers: new Set(["eh", "este"]),
			contractions: { del: ["de", "el"] },
			numberWords: { tres: "3" },
		};
		expect(tokenNorms("Eh, salí del tren a las tres", spanishish)).toEqual([
			"salí",
			"de",
			"el",
			"tren",
			"a",
			"las",
			"3",
		]);
	});
});
