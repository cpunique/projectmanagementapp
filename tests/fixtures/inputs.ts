// Inputs used to exercise the Generate Tasks feature. Kept in one place so the
// unit tests and the manual verification runs use identical text.

// Expert-style input (475 characters), Planning style "development". Output from
// the pre-change generator is saved as Sub_Pro_2026-10-25.json next to this file.
export const EXPERT_INPUT =
  'Build a PWA that alerts New Jersey substitute teachers to Frontline jobs faster and smarter. Subs forward Frontline emails to a private address; a parser extracts job details, matches preferences, and sends push alerts (SMS backup) with a one-tap link to Frontline. Sticky features: feed health check, 20-day limit and credential tracker, missed-job log, calendar sync. Stack: React/Vite, Firebase, Node on Railway, Stripe. Plan: timing test, parser, private beta, paid tier.';

// Novice input: names no technology and says so.
export const NOVICE_INPUT =
  'I want an app where my dog-walking customers can book and pay me. I have never built anything.';

// Trivial, fully specified input. Must not sprout registrations, legal, or monitoring cards.
export const TRIVIAL_INPUT = 'Add a dark mode toggle to the settings page of my existing React app.';

// Non-software input for a non-development Planning style ("general").
export const RENOVATION_INPUT =
  'Renovate my 1960s kitchen: new cabinets, countertops, flooring and lighting. I will hire a contractor for the electrical work and do the painting myself. Budget is not decided yet.';

// Conflicting constraints.
export const CONFLICT_INPUT =
  'Build a mobile app for my bakery that works fully offline, always shows live inventory from the shop server, ships in one week, and has every feature a big chain app has.';

// Schedule scenarios (date handling is also unit-tested without the model).
export const START_AND_HOURS_INPUT =
  'Build a simple website with a contact form for my plumbing business. Start on 2026-11-02 and I can only work 5 hours a week.';

export const TIGHT_DEADLINE_INPUT =
  'Build a booking website with online payments for my yoga studio. It must be live by 2026-11-06. I can work 5 hours a week.';

// Short inputs for the other Planning styles.
export const EVENT_INPUT = 'Plan a 60-person retirement party for my colleague in March at a venue to be chosen.';
export const DOCUMENTATION_INPUT = 'Write an onboarding guide for new volunteers at our community food bank.';
export const RESEARCH_INPUT = 'Find out whether electric school buses are cost-effective for a mid-sized rural school district.';
