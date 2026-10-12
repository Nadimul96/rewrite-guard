import type { Unit } from "../corpus/index.js";
import type { Rng } from "../rng.js";
import {
	fillerRemoval,
	heavyParaphrase,
	lightParaphrase,
	moveAdverbial,
	punctuationCasing,
} from "./faithful.js";
import type { Perturbation, PerturbContext } from "./types.js";
import {
	dropBeat,
	dropDetails,
	dropNegation,
	dropPayoff,
	dropQualifier,
	insertName,
	insertNumber,
	insertPlace,
	replaceName,
	replaceNumber,
	shuffleBeats,
	swapBeats,
	swapRoles,
} from "./unfaithful.js";

export type { Perturbation, PerturbContext };

export type Label = "faithful" | "unfaithful";

interface PerturbationSpec {
	readonly label: Label;
	readonly description: string;
	readonly apply: (unit: Unit, rng: Rng, context: PerturbContext) => Perturbation | null;
}

/**
 * Every perturbation the benchmark generates. Unfaithful ones change a fact,
 * its polarity or its order; faithful ones change only surface form.
 */
export const PERTURBATIONS = {
	drop_payoff: { label: "unfaithful", description: "Drop the ending", apply: dropPayoff },
	drop_beat: { label: "unfaithful", description: "Drop a middle sentence", apply: dropBeat },
	drop_details: { label: "unfaithful", description: "Drop scattered details", apply: dropDetails },
	drop_qualifier: { label: "unfaithful", description: "Drop a time or place phrase", apply: dropQualifier },
	drop_negation: { label: "unfaithful", description: "Drop a negation", apply: dropNegation },
	swap_beats: { label: "unfaithful", description: "Swap two events", apply: swapBeats },
	shuffle_beats: { label: "unfaithful", description: "Reorder every event", apply: shuffleBeats },
	insert_name: { label: "unfaithful", description: "Insert a new name", apply: insertName },
	insert_place: { label: "unfaithful", description: "Insert a new place", apply: insertPlace },
	insert_number: { label: "unfaithful", description: "Insert a new number", apply: insertNumber },
	replace_number: { label: "unfaithful", description: "Replace a number", apply: replaceNumber },
	replace_name: { label: "unfaithful", description: "Replace a name", apply: replaceName },
	swap_roles: { label: "unfaithful", description: "Swap who did what", apply: swapRoles },
	punctuation_casing: { label: "faithful", description: "Punctuation and casing", apply: punctuationCasing },
	filler_removal: { label: "faithful", description: "Remove fillers", apply: fillerRemoval },
	light_paraphrase: { label: "faithful", description: "Light paraphrase", apply: lightParaphrase },
	move_adverbial: { label: "faithful", description: "Move a time or place phrase", apply: moveAdverbial },
	heavy_paraphrase: {
		label: "faithful",
		description: "Heavy paraphrase (hand-written)",
		apply: heavyParaphrase,
	},
} as const satisfies Record<string, PerturbationSpec>;

export type PerturbationType = keyof typeof PERTURBATIONS;

export const PERTURBATION_TYPES = Object.keys(PERTURBATIONS) as PerturbationType[];
