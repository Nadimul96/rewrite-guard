import type { CorpusDocument } from "./types.js";

/**
 * Sixteen synthetic operational texts written for this repository: incident
 * notes, schedules, procedures, release notes. Every name, place and number
 * is invented. They are the kind of text people ask an LLM to summarize or
 * clean up, and they are dense with the facts a rewrite must not change.
 */
const notice = (id: string, title: string, ordered: boolean, sentences: string[]): CorpusDocument => ({
	id: `notice/${id}`,
	kind: "notice",
	title,
	sentences,
	ordered,
});

export const NOTICES: readonly CorpusDocument[] = [
	notice("warehouse-load-delay", "Warehouse load delay", true, [
		"At 02:14 the nightly load into the orders warehouse stalled because the upstream export arrived 40 minutes late.",
		"The on-call engineer paused the downstream jobs so no partial data reached the dashboards.",
		"She did not rerun the full backfill and replayed only the 3 missing partitions.",
		"The tables were complete again by 03:05, and no customer reports were affected.",
	]),
	notice("library-hours", "Library hours change", false, [
		"The Elm Street branch library will close at 5 pm on Fridays starting March 3.",
		"Saturday hours do not change.",
		"Returns can still be left in the outdoor drop box, which is emptied twice a day.",
		"Fines will not be charged for items due during the first two weeks of the new schedule.",
		"Questions can go to the branch manager, Rosa Delgado.",
	]),
	notice("ferry-schedule", "Ferry schedule", false, [
		"From June 1 the harbor ferry to Bell Island leaves every 30 minutes instead of every 45.",
		"The first departure moves to 6:15 and the last to 22:30.",
		"Bicycles are allowed on all sailings except the 8:00 commuter run.",
		"Tickets bought before June 1 remain valid.",
		"The ferry does not run on December 25.",
	]),
	notice("sample-protocol", "Sample preparation", true, [
		"Thaw each sample at room temperature for 20 minutes.",
		"Spin the tubes at 3,000 rpm for 5 minutes.",
		"Pipette 200 microliters of the clear layer into a fresh tube without touching the pellet.",
		"Label the tube with the sample number and the date.",
		"Store finished tubes at minus 80 degrees, never in the door of the freezer.",
	]),
	notice("bridge-works", "Bridge works", false, [
		"Lanes on the Mill River bridge will narrow from four to two between April 10 and May 22.",
		"Crews will replace 14 expansion joints and will work only at night.",
		"Pedestrians can still use the north walkway, but the south walkway will be closed.",
		"No detour is needed for buses on route 9.",
		"Drivers should expect delays of about 10 minutes.",
	]),
	notice("billing-release", "Billing service release notes", false, [
		"Version 2.4 of the billing service adds monthly invoices in PDF.",
		"Exports now include the tax region of each customer.",
		"The legacy CSV endpoint is not removed yet and will be retired on September 30.",
		"Retries for failed card payments drop from 5 attempts to 3.",
		"No database migration is required for this release.",
	]),
	notice("committee-minutes", "Planning committee minutes", true, [
		"The planning committee met on Tuesday with 7 of 9 members present.",
		"Omar Haddad presented the revised budget of 1.2 million for the park renovation.",
		"Two members asked to keep the playground in the first phase.",
		"The committee voted 5 to 2 to approve the budget.",
		"The next meeting is set for October 14 at the community hall.",
	]),
	notice("lentil-soup", "Lentil soup method", true, [
		"Heat two tablespoons of oil in a heavy pan over medium heat.",
		"Add one chopped onion and cook it for 8 minutes until soft but not brown.",
		"Stir in the garlic and the cumin and cook for 1 more minute.",
		"Pour in the lentils with 4 cups of water and simmer for 25 minutes.",
		"Season with salt only at the end, never before the lentils are tender.",
	]),
	notice("parcel-exception", "Parcel delivery exception", true, [
		"Your parcel left the Leeds depot on Monday at 7:40.",
		"The driver attempted delivery at 13:05, but nobody was available to sign.",
		"The parcel was not left with a neighbor because it requires a signature.",
		"It is now held at the Kirkstall pickup point for 7 days.",
		"After that it will return to the sender.",
	]),
	notice("office-move", "Office move", false, [
		"The data team moves from the third floor to the fifth floor on Friday, November 8.",
		"Desks will be assigned by name, not by team.",
		"Please pack personal items in the 2 boxes left at each desk.",
		"Monitors and docks stay in place and should not be packed.",
		"Support staff will reconnect laptops on Monday morning.",
	]),
	notice("water-advisory", "Boil-water advisory", false, [
		"Residents of the Northgate district should boil tap water for at least one minute before drinking it.",
		"The advisory follows a pressure drop at the Vale pumping station on Sunday night.",
		"Water remains safe for showering and laundry.",
		"Bottled water is available at the Northgate school gym from 9 am to 6 pm.",
		"The city expects to lift the advisory within 48 hours.",
	]),
	notice("maps-exhibit", "Museum exhibit", false, [
		"The Harbor Museum opens its maritime maps exhibit on May 2.",
		"The collection includes 64 hand-drawn charts loaned by the Lisbon naval archive.",
		"Photography is allowed, but flash is not.",
		"Entry to the exhibit is free for visitors under 12.",
		"The exhibit closes on August 31 and will not travel to other cities.",
	]),
	notice("clinic-reminder", "Clinic appointment reminder", false, [
		"Your appointment with Dr. Okafor is on Thursday at 10:30 at the Riverside clinic.",
		"Please arrive 15 minutes early to complete the intake form.",
		"Do not eat for 8 hours before the blood test.",
		"Bring your insurance card and a list of current medications.",
		"If you cannot attend, call at least 24 hours ahead to avoid a fee.",
	]),
	notice("payments-incident", "Payments API incident", true, [
		"At 14:02 the payments API began returning errors for about 12 percent of requests.",
		"The cause was an expired certificate on one of 3 load balancers.",
		"Engineers removed that balancer from rotation at 14:19, and errors stopped within 2 minutes.",
		"No payments were charged twice.",
		"A renewal alert now fires 30 days before any certificate expires.",
	]),
	notice("school-closure", "School closure", false, [
		"All Pinewood schools will close on Wednesday because of the forecast snowstorm.",
		"Classes will not move online that day.",
		"Staff should not travel to the buildings unless they are on the facilities rota.",
		"Lunch vouchers issued for Wednesday can be used on Thursday instead.",
		"Schools will reopen on Thursday unless the roads remain closed.",
	]),
	notice("commuter-survey", "Commuter survey results", false, [
		"The 2026 commuter survey received 4,812 responses from 6 neighborhoods.",
		"Bicycle commuting rose from 9 percent to 14 percent since the last survey.",
		"Most respondents said they would not pay more for a faster bus.",
		"Parking was the top complaint in Eastfield but not in the other neighborhoods.",
		"The full results will be published on the city website in January.",
	]),
];
