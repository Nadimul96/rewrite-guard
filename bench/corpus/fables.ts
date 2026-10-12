import type { CorpusDocument } from "./types.js";

/**
 * Sixteen Aesop fables, retold in plain modern English for this repository.
 * The plots are in the public domain; the wording here is original.
 */
const fable = (id: string, title: string, sentences: string[]): CorpusDocument => ({
	id: `fable/${id}`,
	kind: "fable",
	title,
	sentences,
	ordered: true,
});

export const FABLES: readonly CorpusDocument[] = [
	fable("tortoise-hare", "The Tortoise and the Hare", [
		"A hare mocked a tortoise for walking so slowly.",
		"The tortoise challenged the hare to a race across the meadow.",
		"The hare ran far ahead and lay down under a tree to nap.",
		"The tortoise never stopped walking and passed the sleeping hare.",
		"When the hare woke up, the tortoise had already crossed the finish line.",
	]),
	fable("fox-grapes", "The Fox and the Grapes", [
		"A hungry fox saw ripe grapes hanging from a high vine.",
		"He jumped for them again and again but could not reach them.",
		"After the tenth jump he gave up and walked away.",
		"He told himself the grapes were sour and not worth eating anyway.",
	]),
	fable("boy-wolf", "The Boy Who Cried Wolf", [
		"A young shepherd grew bored watching the sheep above the village.",
		"He shouted that a wolf was attacking, and the villagers ran up the hill.",
		"There was no wolf, and the boy laughed at them.",
		"He played the same trick twice more in the next week.",
		"When a real wolf came, nobody believed his cries, and the flock scattered.",
	]),
	fable("ant-grasshopper", "The Ant and the Grasshopper", [
		"All summer an ant carried grain to its nest.",
		"A grasshopper spent those same days singing in the sun.",
		"The grasshopper laughed that winter was months away.",
		"When the snow came, the grasshopper had nothing to eat.",
		"It begged the ant for food, but the ant had stored only enough for its own family.",
	]),
	fable("lion-mouse", "The Lion and the Mouse", [
		"A lion caught a mouse that had run across his paw.",
		"The mouse begged to be released and promised to repay him one day.",
		"The lion laughed but let the mouse go.",
		"Weeks later hunters trapped the lion in a rope net.",
		"The mouse chewed through the ropes until the lion was free.",
	]),
	fable("crow-pitcher", "The Crow and the Pitcher", [
		"A thirsty crow found a pitcher with a little water at the bottom.",
		"Her beak was too short to reach the water.",
		"She dropped pebbles into the pitcher one at a time.",
		"After about 40 pebbles the water rose high enough to drink.",
	]),
	fable("wind-sun", "The North Wind and the Sun", [
		"The North Wind and the Sun argued about which of them was stronger.",
		"They agreed that whoever made a traveler remove his coat would win.",
		"The wind blew hard, but the traveler only pulled his coat tighter.",
		"Then the sun shone warmly, and soon the traveler took the coat off.",
	]),
	fable("town-country-mouse", "The Town Mouse and the Country Mouse", [
		"A country mouse invited his cousin from the town to a simple dinner of beans.",
		"The town mouse said the food was plain and invited him to the city instead.",
		"In the city they found cheese and cake on a large table.",
		"Two dogs burst into the room, and the mice barely escaped.",
		"The country mouse went home and said he preferred beans in peace.",
	]),
	fable("dog-reflection", "The Dog and His Reflection", [
		"A dog carried a bone across a narrow bridge over a stream.",
		"He looked down and saw another dog with a bigger bone.",
		"He snapped at the other dog to take its bone.",
		"His own bone fell into the water, and he realized the other dog was his reflection.",
	]),
	fable("golden-goose", "The Goose That Laid the Golden Eggs", [
		"A farmer owned a goose that laid one golden egg every morning.",
		"He grew rich, but he also grew impatient.",
		"He decided to cut the goose open to take all the gold at once.",
		"Inside he found no gold at all, and the eggs stopped forever.",
	]),
	fable("milkmaid-pail", "The Milkmaid and Her Pail", [
		"A milkmaid walked to the market with a pail of milk on her head.",
		"She planned to sell the milk and buy 12 eggs.",
		"She imagined the eggs hatching and the chickens buying her a new dress.",
		"She tossed her head proudly, and the pail fell and spilled every drop.",
	]),
	fable("fox-crow", "The Fox and the Crow", [
		"A crow sat on a branch holding a piece of cheese in her beak.",
		"A fox below praised her feathers and asked to hear her sing.",
		"The crow opened her beak to sing, and the cheese fell.",
		"The fox ate the cheese and told her not to trust flatterers.",
	]),
	fable("wolf-sheepskin", "The Wolf in Sheep's Clothing", [
		"A wolf found a sheepskin and wrapped it around himself.",
		"He walked into the flock without the shepherd noticing.",
		"That evening the shepherd chose an animal for his supper.",
		"He picked the wolf by mistake, and the disguise did not save him.",
	]),
	fable("travelers-bear", "The Two Travelers and the Bear", [
		"Two friends were walking through a forest when a bear appeared.",
		"One friend climbed a tree without warning the other.",
		"The second friend lay on the ground and held his breath.",
		"The bear sniffed his ear and walked away.",
		"He told his friend that the bear had advised him not to travel with cowards.",
	]),
	fable("farmer-sons", "The Farmer and His Sons", [
		"An old farmer told his 3 sons that treasure was buried in the vineyard.",
		"After he died, the sons dug up every row looking for gold.",
		"They found no treasure in the soil.",
		"The digging loosened the ground, and that autumn the vines gave a huge harvest.",
	]),
	fable("bundle-sticks", "The Bundle of Sticks", [
		"A father grew tired of his sons quarreling every day.",
		"He handed them a bundle of sticks tied together and asked them to break it.",
		"None of them could break the bundle.",
		"He untied it, and each son snapped a single stick with ease.",
		"He told them they would be strong together and weak apart.",
	]),
];
