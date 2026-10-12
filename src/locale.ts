/**
 * Language tables used by the tokenizer and the checks. The algorithms are
 * language-neutral; everything English-specific lives in a `Locale` value so a
 * caller can supply another language without forking the code.
 */
export interface Locale {
	/** BCP 47 tag used for case folding. */
	readonly id: string;
	/** Contractions expanded into their full words before comparison. */
	readonly contractions: Readonly<Record<string, readonly string[]>>;
	/** Hesitation sounds dropped everywhere ("um", "uh"). */
	readonly fillers: ReadonlySet<string>;
	/**
	 * Multi-word discourse fillers dropped only when punctuation brackets them,
	 * so "you know him" stays evidence while ", you know," does not.
	 */
	readonly parentheticalFillers: readonly (readonly string[])[];
	/** Discourse markers a rewrite may drop or add anywhere ("basically"). */
	readonly discourseMarkers: ReadonlySet<string>;
	/** Discourse markers that are optional only at the start of a clause ("so"). */
	readonly clauseInitialMarkers: ReadonlySet<string>;
	/**
	 * Function words a rewrite may introduce without inventing a fact. They are
	 * still compared for coverage, so dropping them costs a little.
	 */
	readonly glueWords: ReadonlySet<string>;
	/** Polarity words whose loss or addition flips a claim. */
	readonly negations: ReadonlySet<string>;
	/** Spelled-out numbers mapped to digits so "three" and "3" compare equal. */
	readonly numberWords: Readonly<Record<string, string>>;
	/**
	 * Words that may stand in for each other when deciding whether a rewrite
	 * token is invented (grammatical case of the same participant).
	 */
	readonly equivalentWords: readonly (readonly string[])[];
}

const words = (list: string) => new Set(list.split(/\s+/).filter(Boolean));

const ENGLISH_CONTRACTIONS: Record<string, readonly string[]> = {
	"ain't": ["is", "not"],
	"aren't": ["are", "not"],
	"can't": ["can", "not"],
	cannot: ["can", "not"],
	"couldn't": ["could", "not"],
	"didn't": ["did", "not"],
	"doesn't": ["does", "not"],
	"don't": ["do", "not"],
	"hadn't": ["had", "not"],
	"hasn't": ["has", "not"],
	"haven't": ["have", "not"],
	"he'd": ["he", "would"],
	"he'll": ["he", "will"],
	"he's": ["he", "is"],
	"i'd": ["i", "would"],
	"i'll": ["i", "will"],
	"i'm": ["i", "am"],
	"i've": ["i", "have"],
	"isn't": ["is", "not"],
	"it'll": ["it", "will"],
	"it's": ["it", "is"],
	"let's": ["let", "us"],
	"mightn't": ["might", "not"],
	"mustn't": ["must", "not"],
	"needn't": ["need", "not"],
	"she'd": ["she", "would"],
	"she'll": ["she", "will"],
	"she's": ["she", "is"],
	"shouldn't": ["should", "not"],
	"that's": ["that", "is"],
	"there's": ["there", "is"],
	"they'd": ["they", "would"],
	"they'll": ["they", "will"],
	"they're": ["they", "are"],
	"they've": ["they", "have"],
	"wasn't": ["was", "not"],
	"we'd": ["we", "would"],
	"we'll": ["we", "will"],
	"we're": ["we", "are"],
	"we've": ["we", "have"],
	"weren't": ["were", "not"],
	"what's": ["what", "is"],
	"who's": ["who", "is"],
	"won't": ["will", "not"],
	"wouldn't": ["would", "not"],
	"you'd": ["you", "would"],
	"you'll": ["you", "will"],
	"you're": ["you", "are"],
	"you've": ["you", "have"],
};

const ENGLISH_NUMBER_WORDS: Record<string, string> = {
	zero: "0",
	one: "1",
	two: "2",
	three: "3",
	four: "4",
	five: "5",
	six: "6",
	seven: "7",
	eight: "8",
	nine: "9",
	ten: "10",
	eleven: "11",
	twelve: "12",
	thirteen: "13",
	fourteen: "14",
	fifteen: "15",
	sixteen: "16",
	seventeen: "17",
	eighteen: "18",
	nineteen: "19",
	twenty: "20",
	thirty: "30",
	forty: "40",
	fifty: "50",
	sixty: "60",
	seventy: "70",
	eighty: "80",
	ninety: "90",
};

export const english: Locale = Object.freeze({
	id: "en-US",
	contractions: ENGLISH_CONTRACTIONS,
	fillers: words("ah er erm hm hmm uh uhh uhm um umm mhm"),
	parentheticalFillers: [
		["you", "know"],
		["i", "mean"],
	],
	discourseMarkers: words("anyway anyways basically literally honestly"),
	clauseInitialMarkers: words("so well okay ok alright"),
	glueWords: words(
		`a an and are as at be been being but by did do does for from had has have
		 here in into is it its of on or out over that the then there these this those
		 to up was were when while with just really very quite also`,
	),
	negations: words("not no never nobody none nothing nowhere neither nor without"),
	numberWords: ENGLISH_NUMBER_WORDS,
	equivalentWords: [
		["i", "me", "my", "mine", "myself"],
		["we", "us", "our", "ours", "ourselves"],
		["you", "your", "yours", "yourself"],
		["he", "him", "his", "himself"],
		["she", "her", "hers", "herself"],
		["they", "them", "their", "theirs", "themselves"],
	],
});
