import type { CorpusDocument } from "./types.js";

/**
 * Thirty ordinary four-beat anecdotes. Each sentence is one event, in order.
 * They are adapted from a golden test set written for an earlier private
 * project and rewritten here as neutral, generic stories.
 */
const story = (id: string, title: string, sentences: string[]): CorpusDocument => ({
	id: `story/${id}`,
	kind: "story",
	title,
	sentences,
	ordered: true,
});

export const STORIES: readonly CorpusDocument[] = [
	story("lunch-name-mixup", "The wrong name", [
		"I met Maya for lunch at a small restaurant.",
		"Halfway through the meal she smiled and called me Brad.",
		"She froze because Brad was her brother and not my name.",
		"I laughed, ordered dessert, and told her Brad could cover the bill.",
	]),
	story("cafe-interviewer", "Two introductions, one table", [
		"I sat down with Nia at a crowded corner cafe.",
		"Her friend Leah walked over and recognized me immediately.",
		"Leah quietly admitted that she had interviewed me for a job that morning.",
		"Nia made us compare notes and discovered I had told the same opening joke twice.",
	]),
	story("diner-wallet", "The disappearing wallet", [
		"Alex suggested a late dinner at a neon diner.",
		"When the receipt arrived Alex announced that the wallet was missing.",
		"I noticed the wallet sitting beside Alex under the napkin.",
		"Alex called it a test, so I paid my half and left the test behind.",
	]),
	story("park-voice-note", "The accidental voice note", [
		"Sam and I walked through the riverside park after coffee.",
		"Sam recorded a phone message for roommate Jo about how the afternoon was going.",
		"The message played from the speaker instead of sending privately.",
		"The review was positive, so I bowed and suggested a second walk.",
	]),
	story("noodle-secret-menu", "The secret menu expert", [
		"Rae told me this noodle restaurant had a famous secret menu.",
		"Rae confidently asked server Dev for a dish called Dragon Thunder.",
		"Dev stared at us and said Rae had just invented those words.",
		"Rae ordered regular noodles and claimed the secret menu had changed.",
	]),
	story("cafe-tab-stranger", "The stranger's tab", [
		"I opened a tab for one coffee at a packed downtown cafe.",
		"A stranger named Chris kept telling people to add drinks to my tab.",
		"Barista Toni showed me the receipt before charging anything.",
		"Chris disappeared, but Toni canceled every drink except mine.",
	]),
	story("tea-house-celebrity", "The accidental celebrity", [
		"I met flight attendant Mina at a tea house in Cebu City.",
		"Mina told me the strangest part of the job was recognizing passengers downtown.",
		"A former passenger walked in and thanked Mina for calming a rough flight.",
		"We stayed at the tea house while Mina became the accidental local celebrity.",
	]),
	story("karaoke-volunteer", "The fake karaoke expert", [
		"Omar and I found the quietest table at a karaoke lounge.",
		"Omar told host Priya that I knew every word to the next song.",
		"I reached the stage and realized the lyrics were in another language.",
		"The crowd sang for me while I danced like that had been the plan.",
	]),
	story("lounge-keys", "The mystery keys", [
		"I found a set of keys under my chair in a hotel lounge.",
		"Guest Nico claimed the keys before receptionist Elle could inspect them.",
		"The keychain said dance studio, and Nico admitted he had never danced.",
		"Elle found the real owner, who gave us a free dance lesson.",
	]),
	story("costume-interview", "The roommate entrance", [
		"I sat in our shared apartment recording a serious job application.",
		"My roommate Drew entered behind me wearing a giant dinosaur costume.",
		"I kept answering the interview question while Drew silently danced.",
		"The recruiter laughed and said the team appreciated calm under pressure.",
	]),
	story("neighbor-alarm", "The neighbor's alarm", [
		"A loud alarm woke me in my apartment before sunrise.",
		"I knocked next door and asked neighbor Kai to turn it off.",
		"Kai walked in and found my old clock buried behind a suitcase.",
		"I apologized with breakfast and finally retired the clock.",
	]),
	story("hotel-noise", "The noise in the wall", [
		"I heard scratching beside the bed in my hotel room.",
		"I called hotel staff member Ren and reported an animal in the wall.",
		"Ren opened the closet and my suitcase rolled across the uneven floor.",
		"We wedged it with a towel and never mentioned my wildlife report again.",
	]),
	story("party-cake-switch", "The birthday cake switch", [
		"Zoe and I carried a birthday cake into a crowded house party.",
		"Host Miles opened the cake and found Happy Retirement written on top.",
		"Another group arrived holding our birthday cake from the bakery.",
		"We served both cakes and toasted the birthday and imaginary retirement.",
	]),
	story("party-coat", "The identical coat", [
		"I hung my black coat beside twenty others at a loft party.",
		"At midnight I grabbed an identical coat and headed downstairs.",
		"A phone in the pocket rang, and guest Ari answered from upstairs.",
		"Ari wore my coat down, and we traded while still on the call.",
	]),
	story("party-song-request", "The song request", [
		"June invited me to what she called a casual rooftop party.",
		"I asked DJ Sol to play June's least favorite breakup song.",
		"Sol pointed at the hidden engagement banner before pressing play.",
		"I changed the request and pretended the breakup song had never happened.",
	]),
	story("party-group-chat", "The wrong group chat", [
		"Ben and I arrived early at Liv's apartment party.",
		"Ben sent a phone message joking that the playlist sounded haunted.",
		"He sent it to Liv's party group instead of our private chat.",
		"Liv replied with a ghost emoji and made Ben control the music.",
	]),
	story("work-screen-share", "The screen-share reveal", [
		"I shared my laptop screen during a serious office meeting.",
		"A giant lunch order popped up over the quarterly numbers.",
		"Manager Kim paused while coworker Luis silently added fries.",
		"Kim approved the budget slide and asked me to add lunch for everyone.",
	]),
	story("work-reply-all", "The reply-all compliment", [
		"Coworker Ana finished a difficult presentation in our open office.",
		"I wrote a phone message saying Ana had carried the entire meeting.",
		"I accidentally sent the message to the company channel with boss Mo included.",
		"Mo agreed, and Ana made me repeat the compliment out loud.",
	]),
	story("work-coffee-label", "The coffee identity crisis", [
		"I left a coffee labeled Alex in the office kitchen.",
		"Designer Alex Chen picked it up and thanked me.",
		"Engineer Alex Rivera arrived and asked why Chen had taken the coffee.",
		"I made a second coffee and banned first names from future labels.",
	]),
	story("work-fake-mute", "The fake mute button", [
		"I joined a morning meeting from my home office.",
		"I thought the laptop was muted and gave myself a dramatic pep talk.",
		"Manager Taylor waited until I finished and applauded with coworker Imani.",
		"They made my pep talk the official opening for the next meeting.",
	]),
	story("travel-wrong-gate", "The wrong gate reunion", [
		"I read my ticket wrong and waited at the opposite airport gate.",
		"A familiar voice behind me belonged to my former roommate Noah.",
		"Noah had also read the ticket wrong and was waiting for another flight.",
		"We sprinted to our separate gates and planned a reunion with better directions.",
	]),
	story("travel-rideshare", "The matching rideshares", [
		"I loaded my suitcase into a silver car at the station rideshare pickup.",
		"Driver Paz asked why the destination belonged to traveler Robin.",
		"Robin stood beside an identical silver car holding my suitcase.",
		"We swapped luggage, confirmed both cars, and finally left the station.",
	]),
	story("travel-hostel-book", "The hostel guidebook", [
		"Suki found an old travel book in our hostel lobby.",
		"The book promised a secret jazz club three blocks away.",
		"We followed the directions and found a laundromat playing quiet jazz.",
		"We washed our clothes, danced once, and called the book technically correct.",
	]),
	story("travel-train-call", "The train announcement", [
		"I answered my phone quietly inside a crowded train carriage.",
		"The train speaker clicked on while I described my missing lunch.",
		"Conductor Lee had pressed the announcement button beside my seat.",
		"The whole carriage applauded when my friend found the lunch.",
	]),
	story("phone-autocorrect", "The autocorrect promotion", [
		"I wrote Dana a phone message saying great job on the project.",
		"Autocorrect changed job to boss before I sent the message.",
		"Dana replied that the promotion sounded sudden but acceptable.",
		"I corrected the message and promised to support the future campaign.",
	]),
	story("phone-old-number", "The recycled number", [
		"My aunt kept sending family phone messages to my old number.",
		"The new owner Pat replied with polite updates about not being me.",
		"After three months Pat knew every birthday and family recipe.",
		"We updated the number and invited Pat to the next family dinner.",
	]),
	story("dispute-thermostat", "The thermostat mystery", [
		"Casey and I argued in our apartment about who changed the temperature.",
		"We each insisted the other person kept making the room colder.",
		"Then we watched Casey's cat step directly onto the thermostat controls.",
		"We apologized, moved the chair, and blamed the cat together.",
	]),
	story("dispute-parking", "The parking-space standoff", [
		"Neighbor Vic and I reached the same parking space at once.",
		"We argued through open car windows about who had arrived first.",
		"The building manager walked over and showed us the reserved sign.",
		"Neither car belonged there, so we reversed in embarrassed silence.",
	]),
	story("reveal-twin", "The identical twin reveal", [
		"I waved at my friend Mara inside a grocery store.",
		"She stared at me, walked away, and returned from another aisle.",
		"Then the first woman appeared beside her and introduced herself as twin Lena.",
		"Mara made us reenact my confused wave while both sisters laughed.",
	]),
	story("reveal-cooking-lesson", "The surprise guests", [
		"Tess invited me to a quiet dinner in my apartment.",
		"I opened the door and found brother Eli hiding with neighbor Nora.",
		"They revealed a cooking lesson because everyone feared my usual dinner.",
		"We cooked together, and I retired my famous burnt noodles.",
	]),
];
