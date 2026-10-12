export type DocumentKind = "story" | "fable" | "notice";

export interface CorpusDocument {
	readonly id: string;
	readonly kind: DocumentKind;
	readonly title: string;
	/** One fact or event per sentence, so perturbations can target a beat. */
	readonly sentences: readonly string[];
	/**
	 * True when sentence order is part of the meaning (a narrative, a timeline,
	 * a procedure). Beat swaps are only labeled unfaithful for these.
	 */
	readonly ordered: boolean;
}
