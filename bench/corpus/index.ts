import { FABLES } from "./fables.js";
import { NOTICES } from "./notices.js";
import { PHRASES } from "./phrases.js";
import { STORIES } from "./stories.js";
import type { CorpusDocument, DocumentKind } from "./types.js";

export { PARAPHRASES } from "./paraphrases.js";
export type { CorpusDocument, DocumentKind };

export const DOCUMENTS: readonly CorpusDocument[] = [...STORIES, ...FABLES, ...NOTICES];

export type UnitLevel = "document" | "sentence" | "phrase";

/** A text the benchmark perturbs: a whole document, one sentence, or a phrase. */
export interface Unit {
	readonly id: string;
	/** Document the unit came from; phrases are their own document. */
	readonly documentId: string;
	readonly kind: DocumentKind | "phrase";
	readonly level: UnitLevel;
	readonly sentences: readonly string[];
	readonly text: string;
	readonly ordered: boolean;
}

export function buildUnits(): Unit[] {
	const units: Unit[] = [];
	for (const document of DOCUMENTS) {
		units.push({
			id: document.id,
			documentId: document.id,
			kind: document.kind,
			level: "document",
			sentences: document.sentences,
			text: document.sentences.join(" "),
			ordered: document.ordered,
		});
		document.sentences.forEach((sentence, index) => {
			units.push({
				id: `${document.id}#${index + 1}`,
				documentId: document.id,
				kind: document.kind,
				level: "sentence",
				sentences: [sentence],
				text: sentence,
				ordered: false,
			});
		});
	}
	for (const [slug, text] of Object.entries(PHRASES)) {
		const id = `phrase/${slug}`;
		units.push({
			id,
			documentId: id,
			kind: "phrase",
			level: "phrase",
			sentences: [text],
			text,
			ordered: false,
		});
	}
	return units;
}

/** People named in the corpus; swap-roles and replace-name pick from these. */
export const PEOPLE: ReadonlySet<string> = new Set(
	`Maya Brad Nia Leah Alex Sam Jo Rae Dev Chris Toni Mina Omar Priya Nico Elle Drew Kai Ren Zoe Miles
	 Ari June Sol Ben Liv Kim Luis Ana Mo Chen Rivera Taylor Imani Noah Paz Robin Suki Lee Dana Pat Casey
	 Vic Mara Lena Tess Eli Nora Rosa Delgado Haddad Okafor`.split(/\s+/),
);

/** Places named in the corpus. */
export const PLACES: ReadonlySet<string> = new Set(
	"Cebu Leeds Kirkstall Lisbon Northgate Vale Eastfield Pinewood Elm Mill Bell Riverside Harbor".split(" "),
);

const CALENDAR =
	"Monday Tuesday Wednesday Thursday Friday Saturday Sunday January March April May June August September October November December";

/** Words that keep their capital when a perturbation moves them mid-sentence. */
export const PROPER_NOUNS: ReadonlySet<string> = new Set([...PEOPLE, ...PLACES, ...CALENDAR.split(" ")]);
