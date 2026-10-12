export interface Perturbation {
	readonly source: string;
	readonly rewrite: string;
	/** What was changed, in a few words, for the report and the playground. */
	readonly note: string;
}

export interface PerturbContext {
	/** Words that keep their capital mid-sentence. */
	readonly properNouns: ReadonlySet<string>;
	/** Named people, for swapping who did what. */
	readonly people: ReadonlySet<string>;
	/** Named people and places, for replacing a name. */
	readonly names: ReadonlySet<string>;
	readonly paraphrases: Readonly<Record<string, string>>;
	/** Function words, which drop-details never removes. */
	readonly glueWords: ReadonlySet<string>;
}
