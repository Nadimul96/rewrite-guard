import { buildUnits, PARAPHRASES, PEOPLE, PLACES, PROPER_NOUNS } from "../../bench/corpus/index.js";
import { PERTURBATIONS, type PerturbationType } from "../../bench/perturb/index.js";
import { seeded } from "../../bench/rng.js";
import { english } from "../../src/locale.js";

export interface Example {
	readonly id: string;
	readonly label: string;
	readonly expected: "faithful" | "unfaithful";
	/** Shown under the verdict: what was changed, and for limits, why it is one. */
	readonly note: string;
	readonly limitation?: string;
	readonly source: string;
	readonly rewrite: string;
}

const SPECS: Array<{ label: string; type: PerturbationType; unit: string; limitation?: string }> = [
	{ label: "Fillers removed", type: "filler_removal", unit: "story/diner-wallet" },
	{ label: "Light paraphrase", type: "light_paraphrase", unit: "notice/payments-incident" },
	{ label: "Time phrase moved", type: "move_adverbial", unit: "notice/parcel-exception" },
	{ label: "Ending dropped", type: "drop_payoff", unit: "story/lunch-name-mixup" },
	{ label: "Negation dropped", type: "drop_negation", unit: "notice/ferry-schedule" },
	{ label: "Events swapped", type: "swap_beats", unit: "fable/tortoise-hare" },
	{ label: "Place invented", type: "insert_place", unit: "story/neighbor-alarm" },
	{ label: "Number changed", type: "replace_number", unit: "notice/committee-minutes" },
	{
		label: "Heavy paraphrase",
		type: "heavy_paraphrase",
		unit: "notice/parcel-exception",
		limitation:
			"Known limit: this rewrite is faithful, but it uses new words. A lexical checker cannot tell a synonym from an invented fact, so it fails closed.",
	},
	{
		label: "Roles swapped",
		type: "swap_roles",
		unit: "story/karaoke-volunteer#2",
		limitation:
			"Known limit: swapping who did what moves only two words. The default profile allows small moves so it can accept rephrasing; the Strict order switch catches this.",
	},
];

/** Examples drawn from the benchmark's own corpus and perturbations. */
export function buildExamples(): Example[] {
	const units = new Map(buildUnits().map((unit) => [unit.id, unit]));
	const context = {
		properNouns: PROPER_NOUNS,
		people: PEOPLE,
		names: new Set([...PEOPLE, ...PLACES]),
		paraphrases: PARAPHRASES,
		glueWords: english.glueWords,
	};
	return SPECS.flatMap((spec) => {
		const unit = units.get(spec.unit);
		const perturbation = PERTURBATIONS[spec.type];
		const result = unit && perturbation.apply(unit, seeded(`${unit.id}::${spec.type}`), context);
		if (!result) return [];
		return [
			{
				id: spec.type,
				label: spec.label,
				expected: perturbation.label,
				note: `${result.note.charAt(0).toUpperCase()}${result.note.slice(1)}.`,
				...(spec.limitation ? { limitation: spec.limitation } : {}),
				source: result.source,
				rewrite: result.rewrite,
			},
		];
	});
}
