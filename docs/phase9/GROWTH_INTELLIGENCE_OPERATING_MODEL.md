# Ask Magic Mike Growth Intelligence operating model

Status: Phase 9 design and implementation contract  
Default authority: internal observation, analysis, ranking, and drafting only  
Consumer automation: disabled unless separately and explicitly approved

## Mission

Create a closed-loop real-estate growth system that:

1. acquires demand from owned, paid, portal, referral, event, partner, and database sources;
2. normalizes every source into one canonical lead and attribution model;
3. identifies intent and urgency without inventing facts;
4. routes opportunities to the right human with an explicit SLA;
5. keeps every eligible non-terminal lead in a useful long-term relationship;
6. connects campaign cost to qualification, appointment, agreement, close, revenue, and referral cost;
7. discovers local market and content opportunities;
8. runs controlled experiments;
9. expands AI authority only through explicit approval, caps, tests, audit, and rollback.

## The operating flywheel

### 1. Acquire

Inputs:

- Ask Magic Mike public funnels;
- Our Town Properties embeds and links;
- Zillow, Realtor.com, Homes.com, Redfin, and other portal programs;
- Meta, Google, TikTok, and future advertising platforms;
- local SEO and answer-engine content;
- Facebook, Instagram, email, QR, print, direct mail, events, and open houses;
- agent referrals, past clients, sphere, vendors, lenders, attorneys, builders, and community partners;
- selected CRM and database sources.

Required output:

- canonical source;
- medium;
- campaign;
- content and placement;
- landing page;
- first touch;
- last touch;
- click IDs;
- external vendor and event IDs;
- property/listing context;
- explicit permission facts;
- request idempotency.

### 2. Recognize

The platform builds a current operational picture from:

- lead type and stated intent;
- timeline;
- geography;
- property address or listing interest;
- financing and preapproval facts when voluntarily supplied;
- question and conversation context;
- site and property engagement;
- previous contact and objections;
- source and placement;
- deterministic score and explanation;
- market signals with source, confidence, and observation time.

Recognition must never infer or use protected traits, familial status, race, religion, disability, national origin, sex, or other prohibited characteristics. It must not convert a statistical signal into a fact about an individual.

### 3. Respond

Operational response order:

1. durable capture;
2. test/suppression check;
3. permission decision;
4. deterministic score;
5. deterministic route;
6. internal notification outbox;
7. action queue and SLA clock;
8. AI summary and draft suggestions;
9. human contact and disposition;
10. follow-up task or approved sequence.

Target internal service levels:

| Condition | Internal target | Escalation |
|---|---:|---|
| Urgent or hot live lead during staffed hours | first human attempt within 5 minutes | immediate owner and backup notification |
| All other contactable live leads during staffed hours | first human attempt within 15 minutes | action queue at 15 minutes, manager review at 30 minutes |
| After-hours urgent lead | immediate internal alert, next staffed-window human attempt | no automatic consumer message unless approved |
| Assigned lead without accepted ownership | configurable claim window | re-route only through deterministic policy and audit |
| No disposition after first attempt | same-day next task | sequence remains approval-gated |

The platform must report median, 75th percentile, and 90th percentile first-human-response time by source, campaign, lead type, and agent.

### 4. Convert

The human conversion workflow follows one principle: resolve the next uncertainty.

For each lead, the system should prepare:

- verified known facts;
- missing facts;
- motivation indicators;
- urgency interpretation;
- likely objections stated as possibilities, not facts;
- source context;
- property or geography context;
- recommended next human action;
- call opener;
- questions;
- email and SMS drafts permitted by the communication matrix;
- appointment options;
- next task and due date.

Required dispositions:

- unable to reach;
- contacted;
- nurturing;
- qualified;
- appointment requested;
- appointment set;
- appointment completed;
- agreement signed;
- under contract;
- closed;
- lost;
- disqualified;
- spam/test.

Every disposition should capture a reason. Free-text notes may add context but cannot replace a structured stage.

### 5. Recycle

A lead remains part of the brokerage's opportunity inventory until it is:

- closed;
- definitively lost;
- disqualified;
- opted out;
- communication-suppressed;
- legally or operationally ineligible;
- deleted under an approved retention policy.

Reactivation cohorts:

- immediate buyer without activity in 7 days;
- active buyer with new matching inventory;
- buyer with price reduction or back-on-market match;
- seller who requested value but did not book;
- seller with changing market conditions;
- homeowner eligible for annual real-estate review;
- past client anniversary;
- open-house visitor without disposition;
- withdrawn or expired opportunity when permitted and sourced lawfully;
- old lead with a newly relevant local market event;
- referral partner due for a relationship touch.

For each cohort, the system may create a draft campaign brief and individual draft messages. Enrollment and delivery require a permission decision and explicit operator approval.

### 6. Learn

Every acquisition and follow-up system must return outcomes to the source ledger:

- qualified;
- appointment;
- agreement signed;
- under contract;
- closed;
- lost;
- disqualified;
- revenue;
- referral fee;
- delivery and reply events;
- response time;
- agent owner;
- experiment and variant.

The platform computes:

- CPL;
- cost per qualified lead;
- cost per appointment;
- cost per agreement;
- cost per close;
- attributed revenue;
- ROAS;
- portal referral cost;
- gross margin after acquisition cost when sufficient data exists;
- source and agent conversion rates;
- reactivation conversion;
- owned versus rented demand share.

No budget recommendation should be made from lead count alone.

## Channel portfolio

### Owned demand

Owned demand should become the largest durable share of the portfolio:

- Ask Magic Mike conversational search;
- Wilson and surrounding-area SEO/AEO pages;
- neighborhood and relocation guides;
- homeowner and property alerts;
- database and past-client programs;
- referral partnerships;
- local market video and social;
- open houses and events;
- QR and direct response tied to canonical attribution.

### Rented demand

Rented demand is acceptable when measured:

- portals;
- paid search;
- paid social;
- predictive seller data;
- referral networks;
- managed advertising vendors.

Every rented source requires:

- current agreement and cost structure;
- territory and capacity plan;
- unique campaign identity;
- spend import;
- lead reconciliation;
- response SLA;
- quality and close measurement;
- stop-loss threshold;
- renewal decision.

## Source-specific workflows

### Portal lead workflow

1. verify signed or authenticated provider event;
2. reject replay through external event ID and payload hash;
3. normalize source, program, campaign, listing, property, and lead IDs;
4. capture explicit consent facts exactly as supplied;
5. create or reconcile the canonical lead;
6. start the internal SLA;
7. route by geography, intent, availability, capacity, and approved portal rules;
8. alert owner and backup;
9. prepare a source-aware opener;
10. record attempts, appointment, close, revenue, and referral fee;
11. return eligible outcomes to provider and ad platforms only after review.

### Meta workflow

1. map ad account, campaign, ad set, ad, placement, form, and creative IDs;
2. preserve `fbclid` and server event identifiers;
3. normalize instant form, website, or message lead;
4. reconcile to the canonical lead;
5. exclude tests, suppressions, and ineligible records;
6. report qualified, appointment, agreement, and close events through an approved Conversions API mapping;
7. compare platform CPL with canonical cost per qualified lead and cost per close;
8. create creative and audience experiments under caps.

### Google workflow

1. preserve `gclid`, `gbraid`, and `wbraid` when present;
2. map campaign, ad group, keyword/search theme, creative, landing page, and LSA source;
3. capture call and message leads with durable external IDs;
4. reconcile enhanced-conversion identifiers under the privacy policy;
5. upload only approved eligible offline outcomes within platform windows;
6. compare reported conversions with canonical outcomes;
7. separate brand, non-brand, seller, buyer, valuation, and local service economics.

### CRM workflow

1. use Ask Magic Mike as canonical capture and intelligence where possible;
2. sync selected facts to the CRM adapter;
3. retain canonical IDs in both systems;
4. consume CRM stage and communication events through signed webhooks or bounded polling;
5. prevent bidirectional loops;
6. reconcile conflicts through documented field ownership;
7. keep consent, routing authority, and source truth in the canonical platform unless an explicit contract changes ownership.

## Database reactivation workflow

### Candidate selection

A candidate must be:

- non-test;
- not suppressed;
- non-terminal;
- within retention policy;
- assigned or eligible for assignment;
- supported by the required channel permission;
- stale under a documented cohort rule;
- not already active in a conflicting sequence.

### AI preparation

The AI may:

- summarize known context;
- identify missing facts;
- match a permitted market or property signal;
- draft a personalized call opener;
- draft email or SMS copy;
- recommend cadence;
- explain confidence and source limitations.

The AI may not:

- infer consent;
- claim a valuation;
- state that a person will move;
- invent property facts;
- create urgency through deception;
- make legal or lending claims;
- send or schedule;
- change ownership or score.

### Approval and execution

1. operator reviews cohort rule;
2. operator reviews representative samples;
3. permission engine evaluates every lead at execution time;
4. test records run first;
5. limited pilot receives explicit approval;
6. provider delivery and replies are monitored;
7. opt-outs, complaints, bounces, and replies stop future steps as configured;
8. results return to the outcome and experiment ledger.

## Experiment operating system

Every experiment requires:

- unique key;
- surface;
- hypothesis;
- primary metric;
- variants;
- deterministic assignment key;
- allocation;
- minimum sample per variant;
- practical uplift threshold;
- guardrails;
- approval status;
- start and end conditions;
- owner;
- result;
- documented decision.

Recommended initial experiments:

### Public funnel

- home-value hero promise;
- address-first versus intent-first intake;
- appointment CTA placement;
- local proof module;
- Mike conversational entry prompt;
- seller timeline question framing;
- property alert opt-in value proposition.

Primary metrics should favor qualified appointments, not raw form completions.

### Operator workflow

- alert presentation;
- action-queue ordering;
- context summary layout;
- call-opener format;
- lead claim window;
- stale-lead cohort presentation;
- manager escalation timing.

Primary metrics should include response time, disposition rate, appointment rate, and operator effort.

### Guardrails

- no increase in spam/test contamination;
- no consent or suppression regression;
- no page performance regression;
- no accessibility regression;
- no rise in complaint or opt-out rates;
- no degradation in contactable or qualified rate;
- no uncontrolled spend change;
- no public or consumer activation without approval.

The deterministic evaluator uses minimum sample and practical uplift. It does not claim statistical significance. Promotion remains human-approved.

## Market opportunity radar

### Inputs

- canonical demand by geography, price range, intent, and source;
- current and historical permitted MLS data;
- listing status, price change, days on market, and inventory;
- questions and conversation categories;
- paid search and social search-term or creative performance;
- local search and content performance;
- homeowner and database engagement;
- agent capacity and conversion;
- referral and community activity;
- external predictive signals with confidence and license metadata.

### Opportunity classes

- buyer demand exceeds inventory;
- seller demand exceeds listing supply;
- high-converting neighborhood or price band;
- high-interest listing with weak appointment conversion;
- stale inventory suitable for buyer re-engagement;
- valuation demand cluster;
- farm area with turnover and weak share;
- frequently asked question without a strong public page;
- paid campaign with tracking or quality failure;
- owned channel with unusually high quality;
- dormant database cohort with a newly relevant signal;
- agent or routing capacity mismatch.

### Required opportunity record

- type;
- geography;
- segment;
- title;
- rationale;
- score;
- confidence;
- estimated value when supportable;
- action class;
- evidence;
- detected time;
- review state;
- owner and next step.

## Tom Ferry execution layer

Technology does not replace the human production cadence. It should make the cadence visible and easier to execute.

### Daily

- protected lead-generation block;
- new lead SLA review;
- action queue;
- database calls and follow-ups;
- active appointment and client work;
- local social response and community engagement;
- end-of-day dispositions and next actions.

### Weekly

- source economics;
- response time by agent and source;
- appointments set and held;
- database reactivation activity;
- listing and buyer pipeline;
- local market content publication;
- geographic farm activity;
- experiment health;
- missed tasks and stalled leads.

### Monthly

- channel budget and renewal decisions;
- database segment health;
- homeowner and past-client campaign;
- local market report or show;
- open-house and event calendar;
- content gap review;
- source and agent conversion trend;
- paid platform reconciliation;
- data quality and permission audit.

### Quarterly

- personal past-client and sphere touch;
- referral partner review;
- geographic farm performance;
- vendor scorecard;
- product and funnel review;
- opportunity radar calibration;
- AI evaluation and cost review;
- compliance and security review.

### Semiannual and annual

- client event;
- annual real-estate review or CMA process where appropriate and human-reviewed;
- vendor contract and territory renewal;
- retention and deletion review;
- brand and market-positioning review;
- full growth portfolio reallocation.

## Decision rules

### Scale candidate

A channel may be recommended for a controlled increase only when:

- spend is complete;
- attribution coverage is acceptable;
- minimum lead and close evidence is met;
- cost per close and margin are acceptable;
- response SLA is healthy;
- capacity exists;
- no experiment or compliance guardrail is breached.

Default recommendation cap: no more than 20% spend increase per operator review cycle.

### Stop or repair candidate

A channel should be paused or repaired when:

- spend exists but canonical leads do not;
- paid leads exist without spend data;
- source or click IDs are missing;
- qualification or appointment rate falls below the documented floor;
- response SLA is materially worse than other sources;
- complaint, invalid-contact, or duplicate rates rise;
- cost per close exceeds the approved ceiling;
- provider terms or delivery are at risk.

### Build-owned-demand candidate

Prioritize an owned campaign when:

- a local question cluster repeats;
- a geography or property segment converts well;
- portal concentration exceeds the portfolio threshold;
- database candidates have relevant new signals;
- referral or event activity shows traction;
- paid search cost rises without proportional close value.

## Governance

### Owner gates

Explicit approval is required for:

- database migration;
- production merge and deployment;
- provider contracts or payment;
- API credentials and secrets;
- public WordPress publication;
- advertising spend;
- consumer email or SMS;
- sequence activation;
- external conversion uploads;
- public content publishing automation;
- expansion of AI action authority;
- legal, privacy, fair-housing, TCPA, MLS, or advertising-policy decisions.

### Audit requirements

Record:

- actor;
- action;
- source facts;
- recommendation and confidence;
- approval;
- mutation result;
- provider result;
- rollback or stop event;
- timestamps;
- relevant lead, campaign, experiment, and external IDs.

### Current release boundary

The Phase 9 branch may be built, tested, reviewed, and deployed to Preview. The migration is prepared but not applied by this change. Consumer automation remains disabled. Resend billing risk must be resolved before relying on future provider delivery.
