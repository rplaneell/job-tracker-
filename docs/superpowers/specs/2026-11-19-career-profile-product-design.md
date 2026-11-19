# Career profile product: from one owner to many people (for approval, nothing built yet)

Date: 2026-11-19. Status: waiting for the owner's approval. No personal data in this file.

## Intent

Today the tool serves one person. The owner wants a version where any person can come to the website, upload a CV, answer an
interview style set of questions (the back and forth the owner and Claude had), end up with a stored, confirmed understanding of
all their experience and skills, and then get a specific, honest CV for each position. A short test at the start should point
to the roles that suit them. Everything the system learns is handed on to a future interview preparation agent.

## Goals, non goals, anti goals

- Goals: a trustworthy knowledge base per person (facts with proof); CVs that are tailored but never invented; a first test that
  is engaging and gives useful, honest direction; a clean handover to interview preparation.
- Non goals for now: applying to jobs for people, sending anything on their behalf, recruiter features, paid plans.
- Anti goals (it would be a failure even if it works): a person's data seen by anyone else; invented claims on a CV; a test that
  pretends to be a scientific diagnosis; costs that surprise the owner; the owner's own CV mixed with other people's.

## The flow, step by step

1. **Sign in** with an email link. Plain consent screen: what is stored, that it is never used to train models, how to export or
   delete everything.
2. **Upload a CV** (PDF or Word). The file is untrusted: size limit, parsed in an isolated step, only the extracted text is kept
   (the original is deleted unless the person asks to keep it). The text is data, never instructions.
3. **Fact extraction.** The system proposes facts (education, experience, skills, languages, certificates). Each fact has a source
   (cv, person, assessment), a status (proposed, confirmed, rejected) and a date. Only confirmed facts may be used on a CV.
4. **Guided interview.** One question at a time, built on the person's last answer. For each experience it climbs an evidence
   ladder: what you did, how you did it, what changed because of it, a number if one exists, who it was for. Answers become
   confirmed facts and short stories the person has approved.
5. **The start test** (below) produces signals about interests, working style and strengths, stored as facts with source
   "assessment" and a confidence level, never overriding what the person says about themselves.
6. **Role map.** From facts plus signals: role families that suit them, gaps for each, and what to learn or prove next.
7. **Tailored CV, iteratively.** For a chosen role: profile text first, the person reacts, then bullets, skills and order, then the
   full CV. The truthfulness check runs before anything is shown. The person approves the final version.
8. **Interview preparation handover.** The knowledge base, stories, gaps and decisions are the input of the preparation agent.

## The start test as a 3D story (ideas, to choose from)

Status: PARKED. The owner decided this is a later idea, so nothing is built for it now. When it is picked up, it must be general (not tied to science or any one field) so anyone can use it.


Principles for all of them: 10 to 15 minutes, skippable, fully playable with a keyboard, a reduced motion mode and a text only
mode, no personal data needed, no right answers for preferences, results explained in plain words with their uncertainty.

1. **The Office Day** (reuses the Job HQ office we already have). The person is a new hire for one day. Characters bring small
   situations: a lab result that does not add up, a spreadsheet that must be fixed before a meeting, a client who needs a clear
   explanation, a pitch to prepare, a process that wastes time. Limited energy forces choices about what to take, what to hand over
   and how to talk to each character. Measures: interests (investigative, enterprising, conventional, social), working style,
   comfort with numbers and with people.
2. **Lab to Market** (a quest). A discovery in a lab must reach customers. Stages are places on a 3D map: the bench (design a fair
   experiment), the funding office (split a budget with real numbers), the factory (fix a bottleneck), the stage (pitch it). Small
   numerical puzzles hide inside the world (prices, stock, rates), so it doubles as a numerical test. Natural for science and
   engineering students moving into business.
3. **Case Island** (a consulting case as a story). A 3D town has one problem, for example a ferry line that loses money. The person
   walks around, interviews characters, collects data from buildings, then builds and presents a recommendation. Measures structuring,
   numeracy and communication, and doubles as case interview practice.
4. **The Career Corridor.** Five doors, each a three minute vignette of a role family (consulting, finance, venture capital,
   business development, health science). After each the person rates how it felt, and the system also sees how they performed. Fit
   is where enjoyment and performance meet.

Recommendation: prototype one scene of **Lab to Market** first (it uses what the owner already knows), then decide between
extending it or building The Office Day on the existing office.

Scoring is plain deterministic code with tests, not a model's opinion, so results are explainable and repeatable. We do not claim a
validated psychometric instrument. We call it a guide and show how each signal was reached.

## Architecture changes needed for many people

- **Data ownership.** Every table gets a `user_id` and a row level security rule `user_id = auth.uid()`. The owners list is replaced
  by ordinary accounts. The owner becomes the first user and all existing rows are assigned to them in one migration, with a rollback.
- **Tables.** people (profile), facts (with source, status, date), stories, assessment_results, cv_versions (already exists),
  career_document (already exists as a single document), audit_log per user.
- **The honesty guard stays the same.** It already works from a person's confirmed facts, so it generalizes unchanged. It is code,
  not a model, which is what makes it safe to run for strangers.
- **AI runtime.** Claude Code in the owner's session cannot serve strangers. The interview, extraction and drafting need a model.
  Options: the person brings their own key (the key never leaves their browser session), hosted credits (costs money), or an open
  model (free, weaker). Decision needed.
- **Uploads and privacy.** Size and type limits, isolated parsing, no macros, deletion of originals, a "delete everything" button
  that really deletes, export of all data, a retention rule, EU privacy rules (the owner and likely users are in the EU).
- **Abuse and cost.** Rate limits per person, a daily budget guard, sign up limits during a closed beta.
- **Security checks carried over.** Owner only tests become per person tests (a second person sees nothing), prompt injection
  through uploaded CVs is treated as data, every new check gets a failing run first and a deliberate break.

## Phases

0. Done for the owner: private career document, truthfulness guard, tailoring loop, photo rule.
1. Generalize the data model to per person ownership, add the facts table with confirmation, migrate the owner's data.
2. CV upload and fact extraction, then the guided interview.
3. The start test, first one scene of Lab to Market, then the scoring and the role map.
4. Closed beta with a few invited people: consent, deletion, rate limits, cost model.
5. The interview preparation agent consuming the knowledge base.

## Decisions needed from the owner

1. Who is it for first: only you, a few friends in a closed beta, or the public?
2. Who pays for the AI: person's own key, your credits, or a free open model first?
3. Privacy stance: confirm that nothing is used for training, and that every person can delete everything.
4. Which start test concept to prototype first (recommended: Lab to Market).
5. Should the interview preparation agent be the next big piece after phase 2?

## Risks

Cost and abuse once strangers arrive; people's CVs are sensitive personal data; a test can be read as a hiring verdict if worded
badly; model quality on a free runtime; keeping every claim on every CV true. Each has a mitigation above, none is free.


## Career document is generated per person

Every person gets their own career document, generated by `collector/src/jobtracker/career_doc.py` from a structured profile. The structure is identical for everyone, text is treated as data, and each save adds an append only revision. In phase 1 the tables become keyed by user id.
