/**
 * Hand-written, meaning-preserving paraphrases: new vocabulary and sentence
 * structure, same facts in the same order. They measure the price of a
 * lexical method: these are faithful, and most of them are rejected.
 *
 * Keys are unit ids: a document id, `<document>#<sentence number>`, or a
 * phrase id.
 */
export const PARAPHRASES: Readonly<Record<string, string>> = {
	"story/lunch-name-mixup":
		"I had lunch with Maya at a tiny restaurant. Midway through, she grinned and addressed me as Brad. She went silent, since Brad is her brother's name rather than mine. I chuckled, asked for dessert, and said Brad could pay.",
	"story/diner-wallet":
		"Alex proposed eating late at a diner lit with neon. Once the check came, Alex claimed to have lost the wallet. I spotted it right next to Alex, hidden by a napkin. Alex said it had been a test, so I covered my share and walked out.",
	"story/party-coat":
		"At a loft party I hung up my black coat next to about twenty others. Around midnight I took a coat that looked the same and went downstairs. A phone rang in its pocket, and Ari, another guest, picked up from upstairs. Ari brought my coat down and we swapped while the call was still going.",
	"story/work-fake-mute":
		"I dialed into an early meeting from home. Believing my microphone was off, I delivered a theatrical pep talk to myself. My manager Taylor let me finish, then clapped along with Imani from my team. From then on my pep talk opened every following meeting.",
	"story/travel-hostel-book":
		"In the lobby of our hostel Suki picked up an old guidebook. It described a hidden jazz bar a few streets away. Following its directions led us to a laundromat with soft jazz on the radio. We did our laundry, had one dance, and agreed the guidebook was technically right.",
	"story/dispute-parking":
		"Vic, who lives next door, and I pulled up to one parking spot at the same moment. Through our car windows we fought over who got there first. The building manager came out and pointed to a sign marking the spot as reserved. It belonged to neither of us, so we both backed out without a word.",
	"fable/tortoise-hare":
		"A hare made fun of a tortoise for being slow. So the tortoise proposed a race over the meadow. The hare sprinted off and stopped beneath a tree for a nap. Without ever pausing, the tortoise plodded past him. By the time the hare woke, the tortoise had won.",
	"fable/fox-grapes":
		"A starving fox noticed ripe grapes on a tall vine. He leapt for them over and over without success. On his tenth try he quit and left. He decided the grapes must be sour and not worth the effort.",
	"fable/crow-pitcher":
		"A crow dying of thirst came upon a pitcher holding only a little water. She could not get her beak down to it. One by one, she dropped stones into the pitcher. Roughly 40 stones later the water had risen enough for her to drink.",
	"fable/lion-mouse":
		"A lion trapped a mouse that had scampered over his paw. The mouse pleaded for its life and swore it would return the favor. Amused, the lion freed it. Some weeks afterward, hunters caught the lion in a net of ropes. The mouse gnawed the ropes apart and freed the lion.",
	"notice/ferry-schedule":
		"Starting June 1, the Bell Island harbor ferry will depart every 30 minutes rather than every 45. Service will begin at 6:15 and end at 22:30. You may bring a bicycle on any crossing apart from the 8:00 commuter run. Tickets purchased before June 1 can still be used. There is no service on December 25.",
	"notice/payments-incident":
		"Beginning at 14:02, roughly 12 percent of payments API calls failed. One of the 3 load balancers had an expired certificate. At 14:19 engineers took it out of rotation, and the failures ended inside 2 minutes. Nobody was billed twice. An alert now warns 30 days ahead of every certificate expiry.",
	"notice/parcel-exception":
		"On Monday at 7:40 your parcel departed from our Leeds depot. Our driver tried to deliver it at 13:05, but there was no one to sign. Because a signature is required, it was not handed to a neighbor. You can collect it from the Kirkstall pickup point within 7 days. Otherwise it goes back to the sender.",
	"notice/clinic-reminder":
		"You are booked with Dr. Okafor at the Riverside clinic on Thursday at 10:30. Come 15 minutes early to fill in the intake form. Fast for 8 hours before your blood test. Remember your insurance card and a list of the medicines you take. If you are unable to come, phone at least 24 hours in advance to avoid being charged.",
	"story/lunch-name-mixup#2": "Midway through the meal she grinned and addressed me as Brad.",
	"story/cafe-interviewer#2": "Leah, her friend, came over and knew who I was right away.",
	"story/noodle-secret-menu#3": "Dev gave us a blank look and told us Rae had made those words up.",
	"story/neighbor-alarm#1": "Before dawn a blaring alarm woke me up in my apartment.",
	"story/hotel-noise#4": "We propped it with a towel and never brought up my animal report again.",
	"story/party-group-chat#2": "Ben texted a joke saying the playlist sounded haunted.",
	"story/work-screen-share#2": "A huge lunch order appeared on top of the quarterly figures.",
	"story/travel-rideshare#3": "Robin was standing next to a matching silver car with my suitcase.",
	"story/phone-old-number#3": "Three months later Pat knew all the birthdays and family recipes.",
	"story/reveal-twin#2": "She looked at me, left, and came back from a different aisle.",
	"fable/boy-wolf#3": "No wolf was there, and the boy laughed at the villagers.",
	"fable/ant-grasshopper#4": "Once winter arrived, the grasshopper had no food at all.",
	"fable/golden-goose#1": "A farmer had a goose that produced a golden egg each morning.",
	"fable/milkmaid-pail#2": "Her plan was to sell the milk and use the money for 12 eggs.",
	"fable/bundle-sticks#3": "Not one of them managed to break the bundle.",
	"notice/library-hours#1": "Starting March 3, the Elm Street branch library will shut at 5 pm on Fridays.",
	"notice/bridge-works#4": "Buses on route 9 will not need a detour.",
	"notice/billing-release#4": "Failed card payments will be retried 3 times instead of 5.",
	"notice/committee-minutes#4": "By a vote of 5 to 2, the committee approved the budget.",
	"notice/water-advisory#3": "It is still fine to use the water for showers and laundry.",
	"notice/maps-exhibit#3": "You may take photographs, but without flash.",
	"notice/commuter-survey#2":
		"Since the previous survey, the share of people cycling to work went from 9 percent to 14 percent.",
	"phrase/tripped": "I stumbled.",
	"phrase/nobody-came": "No one showed up.",
	"phrase/sales-fell": "Sales dropped steeply.",
	"phrase/lunch-free": "Lunch costs nothing.",
	"phrase/pump-failed": "The pump broke down.",
	"phrase/parcel-arrived": "The package came.",
};
