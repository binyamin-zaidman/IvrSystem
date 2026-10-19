# IvrSystem — Public Transport Fare Payment over a Phone Call

> Buy a bus or train ticket **through an ordinary phone call** — no app, no smartphone, no internet.
> The passenger dials in, navigates a Hebrew voice menu with keypad presses, and receives a **5-digit confirmation code** to show the ticket inspector.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Project Status](#project-status--demonstration-prototype)
- [How It Works — The Passenger Experience](#how-it-works--the-passenger-experience)
- [Architecture](#architecture)
- [The Call State Machine](#the-call-state-machine-fsm)
- [Yemot HaMashiach Protocol](#yemot-hamashiach-protocol)
- [Fare Calculation](#fare-calculation)
- [Confirmation Codes and Inspector Validation](#confirmation-codes-and-inspector-validation)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Installation and Setup](#installation-and-setup)
- [Security](#security)
- [Scope of the Demonstration](#scope-of-the-demonstration)
- [Open Code Tasks](#open-code-tasks)
- [Roadmap](#roadmap)

---

## The Problem

Digital fare payment on Israeli public transport has moved almost entirely to smartphone apps — Moovit, Rav-Kav Online, HopOn and others. Anyone without a smartphone is left out:

- **Older adults** who carry a feature phone.
- **Users of "kosher" phones** — devices deliberately restricted from apps and internet access.
- **Teenagers and children** without a smart device or a digital payment method.
- **Tourists and new immigrants** who have not installed a local app.
- **Edge cases** — a dead battery, a lost phone, or an area with no data coverage.

These passengers are forced back onto a physical Rav-Kav card, topped up at a kiosk or with the driver — a barrier that makes travel more expensive and more complicated precisely for the people who depend on public transport the most.

### The gap is not only convenience — it is money

Israeli fare policy is built around **retroactive best-fare calculation (fare capping)**: at the end of the period the system counts how many rides the passenger actually took and over what distances, compares the total cost of those individual rides against the price of a period pass — a monthly or weekly *Chofshi Chodshi* — and charges whichever is cheaper. The passenger never has to decide in advance which option is better; the decision is made for them in hindsight, based on how they actually travelled.

This is the logic the apps implement on the user's behalf, entirely transparently — the passenger simply travels, and the system makes sure they never pay more than they have to.

Anyone outside the app ecosystem loses exactly this. They are forced to decide **up front**, at the start of the month, whether to buy a monthly pass or pay ride by ride — without knowing how much they will travel, where, or whether they will take a holiday or miss a week to illness. Guessing wrong in either direction costs money: a monthly pass that went half unused, or dozens of single fares that together exceeded the price of the pass. The result is that the least advantaged groups — older adults, teenagers, households without smart devices — end up paying more for the very same journeys.

A voice interface removes that barrier without requiring the passenger to buy a device, install an app or connect to the internet — and it opens the door to connecting them to the same best-fare mechanism that today benefits smartphone owners alone.

## The Solution

An **IVR** (Interactive Voice Response) interface that puts the payment experience of the apps behind an ordinary phone call. All the passenger needs is to dial and press keys — no internet, no app, no smart device.

The system identifies the passenger by the **phone number they are calling from**, collects the journey details through a voice menu, calculates the fare from the Israeli Ministry of Transport's official **GTFS** data, creates a ride record in the database, and reads back a confirmation code valid for 90 minutes.

The inspector on the bus or train receives the code from the passenger and validates it against the system — exactly like validating a digital ticket in an app.

Because every ride is recorded in the database under the passenger's phone number, those records are precisely the basis required for end-of-period best-fare calculation. In the current prototype each ride is priced as a single fare; connecting it to a best-fare and monthly-pass mechanism is the natural next step (see the [Roadmap](#roadmap)).

---

## Project Status — Demonstration Prototype

> [!IMPORTANT]
> **This is a proof of concept built to present the idea to the Israeli Ministry of Transport — not a production system.**
>
> Development focused on proving end-to-end feasibility of the voice payment flow: menu navigation, retrieval of real route data, fare calculation and confirmation-code issuance.
>
> Accordingly, **information security, actual payment collection, load resilience and edge-case handling were not hardened**. A full account of what exists and what is missing appears in [Security](#security), [Scope of the Demonstration](#scope-of-the-demonstration) and [Open Code Tasks](#open-code-tasks).
>
> The system must not be operated against real passengers or real money in its current state.

---

## How It Works — The Passenger Experience

The passenger dials the system's number, hosted on the **Yemot HaMashiach** telephony platform. Every keypress is sent from Yemot to the server as an HTTP request, and the server returns the next voice message.

All prompts are spoken in Hebrew; the transcripts below are translated for readability.

### Example call — bus journey

```text
🔊  "To travel by bus press 1, to travel by train press 2"
📞  1

🔊  "Please enter the line number"
📞  480

🔊  "Line 480. For Egged press 1. For Superbus press 2"
📞  1

🔊  "Choose a direction for line 480.
     For Tel Aviv press 1. For Jerusalem press 2"
📞  1

🔊  "Press 1 for a full journey from origin to destination,
     press 2 to choose boarding and alighting stops"
📞  1

🔊  "Journey created successfully. Line 480,
     travelling from Jerusalem Central to Tel Aviv Arlozorov.
     Confirmation code: 6 3 0 9 6.
     Price: sixteen shekels and fifty agorot.
     Have a good journey"
```

### Example call — train journey

```text
🔊  "To travel by bus press 1, to travel by train press 2"
📞  2

🔊  "To choose an origin station: for the Center region press 1,
     for the Jerusalem region press 2, for the South press 3,
     for the North press 4"
📞  2

🔊  "Choose an origin station in the Jerusalem area:
     for Jerusalem Yitzhak Navon press 1, for Beit Shemesh press 2"
📞  1

🔊  "To choose a destination station: for the Center region press 1, ..."
📞  1

🔊  "Choose a destination station in the Tel Aviv and Center area: ..."
📞  3

🔊  "Train journey created successfully. From Jerusalem Yitzhak Navon
     to Tel Aviv Center. Confirmation code 4 1 2 8 7.
     Price twenty-one shekels. Have a good journey"
```

### Call flow diagram

```mermaid
flowchart TD
    A["📞 Passenger dials in"] --> B{"Transport type?"}

    B -->|"1 — Bus"| C["Enter line number"]
    B -->|"2 — Train"| T1["Choose origin region"]

    C --> D{"How many operators<br/>serve this line?"}
    D -->|"One"| F["Choose direction"]
    D -->|"Several"| E["Choose operator<br/>Egged / Dan / Superbus..."]
    E --> F
    F --> G{"Route type?"}
    G -->|"1 — Full journey"| H["First stop<br/>to last stop"]
    G -->|"2 — Specific stops"| I["Enter boarding stop code"]
    I --> J["Enter alighting stop code"]

    T1 --> T2["Choose origin station"]
    T2 --> T3["Choose destination region"]
    T3 --> T4["Choose destination station"]

    H --> K["Calculate fare<br/>+ create ride"]
    J --> K
    T4 --> K

    K --> L["🔊 Read back confirmation code<br/>and price in Hebrew"]
    L --> M["🎫 Passenger shows the code to the inspector"]
    M --> N["Inspector validates against the system"]
```

---

## Architecture

```mermaid
flowchart LR
    subgraph phone["Passenger"]
        P["☎️ Feature phone"]
    end

    subgraph yemot["Yemot HaMashiach"]
        Y["Telephony switch<br/>Hebrew TTS"]
    end

    subgraph server["Application server — Node.js / Express"]
        MW["yemotAuthMiddleware<br/>signature · DID · rate limit"]
        CTRL["IVRController"]
        FSM["IVRService — state machine<br/>in-memory session keyed by phone"]
        GTFS["GTFSService"]
        CALC["CalculationService"]
        TRIP["TripService"]
        VAL["ValidationService"]
    end

    subgraph db["Supabase — PostgreSQL"]
        D1[("GTFS data<br/>routes · trips · stops · stop_times · fares")]
        D2[("Application data<br/>users · rides · ride_validations")]
    end

    subgraph inspector["Inspector"]
        INS["Inspector app / API"]
    end

    P <-->|"voice call"| Y
    Y <-->|"HTTP POST<br/>webhook"| MW
    MW --> CTRL --> FSM
    FSM --> GTFS --> D1
    FSM --> TRIP --> CALC --> D1
    TRIP --> D2
    INS -->|"confirmation code"| VAL --> D2
```

### Technology stack

| Layer | Technology |
| --- | --- |
| Telephony / IVR | [Yemot HaMashiach](https://www.call2all.co.il/) — webhook API, Hebrew TTS |
| Server | Node.js · TypeScript · Express 5 |
| Database | Supabase (PostgreSQL) via `@supabase/supabase-js` |
| Transit data | Israeli Ministry of Transport GTFS — routes, stops, trips, fares |
| Validation | Zod |
| IVR request authentication | HMAC-SHA256 (`crypto`) |
| Passwords | bcrypt |

### Project structure

```text
src/
├── app.ts                       # Express setup, route registration, health check
├── server.ts                    # Port binding + graceful shutdown
│
├── Config/
│   └── Supabase.ts              # Supabase client initialisation
│
├── Routes/
│   ├── Ivr/ivrRoutes.ts         # Yemot HaMashiach webhook routes
│   └── Api/                     # auth · users · trips · gtfs · payments · validation
│
├── Middlewares/
│   ├── yemotAuthMiddleware.ts   # Verifies the request genuinely came from Yemot
│   └── ValidateBody.ts          # Request-body validation against a Zod schema
│
├── Controllers/
│   ├── IVRController.ts         # Yemot request → FSM input → voice response
│   ├── GTFSController.ts        # REST access to lines, directions and stops
│   ├── ValidationController.ts  # Ride validation for inspectors
│   └── ...                      # Auth · Trip · User · Payment
│
├── Services/
│   ├── try.ts                   # ⭐ The active IVR state machine
│   ├── IVRService.ts            # Earlier FSM version (fully commented out)
│   ├── GTFSService.ts           # GTFS queries + bus/train ride creation
│   ├── CalculateService.ts      # Fare calculation by distance / zone / fare_rules
│   ├── TripService.ts           # Creates the ride record in the rides table
│   ├── PaymentService.ts        # Fare logic and ride verification
│   ├── ValidationService.ts     # Confirmation-code validation, inspector history
│   └── UserService.ts           # User lookup by phone, active ride lookup
│
├── Models/                      # TypeScript types — IVR · GTFS · Trip · Payment ...
├── Validator/userValidator.ts   # Zod schemas for registration and login
└── Utils/Confirm.ts             # Confirmation-code generation and digit extraction
```

---

## The Call State Machine (FSM)

The entire call is driven through a **single endpoint** — `POST /ivr/webhook/handleAll`. Yemot sends every keypress to that same address, and the server is what remembers where the call currently stands.

Session state is held in an in-process `Map`, keyed by the caller's phone number (`ApiPhone`):

```ts
const sessions = new Map<string, UserSession>();
```

`IVRController` reads the session's current step, extracts only the request field relevant to that step, and passes it to `IVRService.handleInput()`.

| Step (`IVRStep`) | Input field from Yemot | What the caller hears | Next step |
| --- | --- | --- | --- |
| `START` | — | "For bus press 1, for train press 2" | `SELECT_TRANSPORT_TYPE` |
| `SELECT_TRANSPORT_TYPE` | `TRANSPORT_TYPE` | Line-number prompt / train region list | `SELECT_LINE` / `SELECT_TRAIN_ORIGIN` |
| `SELECT_LINE` | `LINE` | Operators serving that line | `SELECT_AGENCY` |
| `SELECT_AGENCY` | `AGENCY` | Available travel directions | `SELECT_DIRECTION` |
| `SELECT_DIRECTION` | `DIRECTION` | Full journey or specific stops | `SELECT_STOP_METHOD` |
| `SELECT_STOP_METHOD` | `STOP_METHOD` | Creates full journey / asks for stop code | end / `ENTER_BOARDING_CODE` |
| `ENTER_BOARDING_CODE` | `BOARDING_CODE` | Confirms boarding stop, asks for alighting stop | `ENTER_ALIGHTING_CODE` |
| `ENTER_ALIGHTING_CODE` | `ALIGHTING_CODE` | Creates ride + confirmation code | end |
| `SELECT_TRAIN_ORIGIN` | `TRAIN_REGION_ORIGIN` | Train stations in the chosen region | `SELECT_TRAIN_ORIGIN_STOP` |
| `SELECT_TRAIN_ORIGIN_STOP` | `TRAIN_ORIGIN` | Destination region prompt | `SELECT_TRAIN_DEST_REGION` |
| `SELECT_TRAIN_DEST_REGION` | `TRAIN_REGION_DEST` | Destination stations in that region | `SELECT_TRAIN_DESTINATION` |
| `SELECT_TRAIN_DESTINATION` | `TRAIN_DESTINATION` | Creates train ride + confirmation code | end |

### Shortcuts and usability details

- **Single operator** — if only one operator serves the line, the operator question is skipped automatically.
- **Single direction** — the same skip applies when a line has only one direction.
- **Input validation** — every input is checked against an `allowedDigits` list built dynamically from the length of the list just read out; an invalid choice replays the prompt instead of dropping the call.
- **Session safeguards** — a new call clears a stale session; `hangup=yes` from Yemot clears the session; suspicious input arrays (more than five values for one variable) reset the call.
- **Star and hash handling** — pressing `*` or `#` at the line-number step ends the call politely.
- **Stop-name cleanup for TTS** — `cleanTextForIVR()` strips underscores, slashes, quotes and periods and shortens long names so the TTS engine reads a stop name naturally.
- **Prices spoken as words** — `priceToWords()` converts `16.5` into `שש עשרה שקלים וחמישים אגורות` ("sixteen shekels and fifty agorot"), so the price sounds like a human speaker rather than a raw number.

### Train regions

Train stations are grouped into four geographic regions, defined as fixed `stop_id` lists in code (`TRAIN_REGIONS`): **Center** (33 stations), **Jerusalem** (2), **South** (11) and **North** (18). This grouping keeps the menu short — the passenger picks a region first and only then a station, instead of listening to a list of more than 60 stations.

---

## Yemot HaMashiach Protocol

Yemot expects a `text/plain` response in a defined format. Two response types are used.

**Asking the passenger** — read a message and wait for keypresses:

```text
read=t-message to read=VAR_NAME,yes,maxDigits,minDigits,timeout,Digits,no,no,,allowedDigits
```

For example:

```text
read=t-לנסיעה באוטובוס הקש 1, לנסיעה ברכבת הקש 2=TRANSPORT_TYPE,yes,1,1,30,Digits,no,no,,1.2
```

The Hebrew text reads "To travel by bus press 1, to travel by train press 2". The value the passenger pressed comes back in the next request in a field named `TRANSPORT_TYPE`.

**Message and hang up**:

```text
id_list_message=t-נסיעה נוצרה בהצלחה.t-קוד האישור: 63096.t-נסיעה טובה
hangup=yes
```

The segments read "Journey created successfully", "Confirmation code: 63096", "Have a good journey". A period (`.`) between `t-` segments creates a natural pause in the reading. Responses are always sent with `charset=utf-8` so Hebrew is read correctly.

**Fields Yemot sends with every request:** `ApiCallId`, `ApiPhone` (the caller's number), `ApiDID` (the system's number), `ApiTime`, `ApiExtension`, `ApiEnterID`, plus the variables collected during the call.

---

## Fare Calculation

`CalculationService.calculateFareImproved()` computes a fare through a cascade of four attempts, in descending order of precision, falling back to a default of ₪8 if all of them fail:

1. **By straight-line distance** (`getFareByDistance`) — the Haversine formula between the boarding and alighting stop coordinates. This is the method that applies in practice.
2. **By origin–destination** (`getFareByOriginDestination`) — a match in `fare_rules` on `origin_id` and `destination_id`.
3. **By route** (`getFareByRoute`) — a match in `fare_rules` on `route_id`.
4. **By fare zone** (`getFareByZones`) — compares the stops' `zone_id`; same zone yields the base fare, otherwise it falls back to a distance calculation.

### Fare tiers

| Distance | Bus | Train |
| --- | --- | --- |
| Up to 15 km | ₪8.00 | ₪11.50 |
| Up to 40 km | ₪14.50 | ₪21.00 |
| Up to 75 km | ₪19.00 | ₪27.00 |
| Up to 120 km | ₪19.00 | ₪30.50 |
| Up to 225 km | ₪32.50 | ₪52.50 |
| Over 225 km | ₪74.00 | ₪60.00 |

> These tiers were entered manually for the demonstration, based on Ministry of Transport fare tables. In a production system they should be read from the `fare_attributes` table and updated automatically, and should account for fare zones, eligibility discounts, transfers and daily/monthly capping.

---

## Confirmation Codes and Inspector Validation

At the end of the call a record is created in the `rides` table with a confirmation code and an expiry:

| Field | Value |
| --- | --- |
| Code format | `CONF_#####` for bus · `TRAIN_#####` for train |
| What the passenger hears | The five digits only (`extractDigits`) |
| Validity | 90 minutes from creation (`expires_at`) |

**Retrieving the code again** — a passenger who forgot the code can call back and reach `POST /ivr/webhook/getUserPay`. The system identifies them by phone number, fetches their most recent active ride and reads out the line number, the confirmation code and the minutes remaining.

**Inspector validation** — the inspector submits the code to `POST /api/validation/verify`. `ValidationService` checks the code format, that the ride exists, that it has started and that it has not yet expired, and returns the full ride details together with a breakdown of the checks performed:

```json
{
  "success": true,
  "message": "נסיעה תקפה - נותרו 73 דקות",
  "ride": {
    "line_number": "480",
    "start_stop_id": "12345",
    "end_stop_id": "67890",
    "amount": 16.5,
    "expires_at": "2026-10-19T14:32:00.000Z"
  },
  "validationDetails": {
    "confirmationCodeValid": true,
    "rideExists": true,
    "rideActive": true,
    "timeValid": true
  }
}
```

The `message` field is returned in Hebrew, for display in the inspector's interface; here it reads "Ride valid — 73 minutes remaining".

Every validation is logged in the `ride_validations` table with the inspector's identity, the status and the timestamp — the basis for enforcement reporting and statistics.

---

## API Reference

### IVR — Yemot HaMashiach webhooks

All of these routes pass through `yemotAuthMiddleware`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/ivr/webhook/handleAll` | Drives every stage of the call through the state machine |
| `POST` | `/ivr/webhook/getUserPay` | Reads back the confirmation code of the active ride |

### REST API

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| `GET` | `/health` | Server liveness check | ✅ |
| `POST` | `/api/gtfs/lineBusAgencies` | Operators serving a given line number | ✅ |
| `POST` | `/api/gtfs/directions` | Travel directions by line and operator | ✅ |
| `POST` | `/api/gtfs/stops` | Stops along a route | ✅ |
| `POST` | `/api/trips/createTrip` | Create a ride directly via the API | ✅ |
| `GET` | `/api/trips` | Ride history | 🚧 stub |
| `POST` | `/api/auth/register` | Registration (Zod validation + bcrypt) | 🚧 partial |
| `POST` | `/api/auth/login` · `/logout` | Login / logout | 🚧 stub |
| `GET`/`PUT` | `/api/users/profile` | User profile | 🚧 stub |
| `POST`/`GET` | `/api/payments` | Charging and payment records | 🚧 stub |

### Inspector API

> ⚠️ This router is implemented (`src/Routes/Api/validationRoutes.ts`) but is **not yet mounted in `app.ts`** — see [Open Code Tasks](#open-code-tasks).

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/validation/verify` | Validate a ride by confirmation code |
| `GET` | `/api/validation/active/:phone` | Active ride for a phone number |
| `POST` | `/api/validation/confirm` | Record an inspector validation |
| `GET` | `/api/validation/inspector/:id/history` | An inspector's validation history |
| `GET` | `/api/validation/inspector/:id/stats` | An inspector's validation statistics |

---

## Data Model

### GTFS tables — public transport data

Imported from the Israeli Ministry of Transport's open GTFS feed (see the SQL files at the project root):

| Table | Contents |
| --- | --- |
| `agency` | Transport operators — Egged, Dan, Superbus, Israel Railways |
| `routes` | Lines — `route_short_name` is the line number the passenger dials |
| `trips` | Scheduled trips, including `direction_id` and `trip_headsign` |
| `stops` | Stops — name, stop code, coordinates, `zone_id` |
| `stop_times` | Stop order within each trip (`stop_sequence`) |
| `fare_attributes` · `fare_rules` | Fares and the rules that apply them |
| `calendar` · `shapes` · `translations` | Service days, route geometry, translations |
| `train_stations` | Dedicated table/view for railway stations |

### Application tables

| Table | Contents |
| --- | --- |
| `users` | Passengers — `phone_number` is the identifier used during the call |
| `rides` | Purchased journeys — stops, coordinates, `line_number`, `amount`, `confirmation_code`, `expires_at` |
| `ride_validations` | Inspector validations — `ride_id`, `inspector_id`, status, timestamp, notes |

### Integrity checks before a ride is created

Before a ride record is written, the system verifies against the GTFS data that:

- Both stops exist in the database.
- Both stops genuinely lie on the chosen route and direction (`isStopOnRoute`).
- The boarding stop precedes the alighting stop (`stop_sequence`).
- The destination differs from the origin.

---

## Installation and Setup

### Prerequisites

- Node.js 18 or later
- An active Supabase (or PostgreSQL) project
- Israeli Ministry of Transport GTFS files
- An active Yemot HaMashiach system with an extension pointed at the server

### Install

```bash
git clone https://github.com/binyamin-zaidman/IvrSystem.git
cd IvrSystem
npm install
```

### Environment variables

Create a `.env` file at the project root (it is excluded from Git):

```env
# Server
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Yemot request authentication — required; the server refuses to start without them
YEMOT_SECRET_KEY=your-hmac-signing-secret
YEMOT_ALLOWED_DIDS=0771234567,0772345678
```

> `yemotAuthMiddleware` deliberately fails fast at load time if `YEMOT_SECRET_KEY` or `YEMOT_ALLOWED_DIDS` is missing — so the system can never come up accidentally with a default signing secret or without an explicit allowlist of system numbers.

### Database setup

Two SQL files at the project root handle the schema and the data import:

1. The `CREATE TABLE` file — drops and rebuilds the GTFS tables in dependency order.
2. The `COPY` file — imports the GTFS `.txt` files into those tables. Update the paths inside it to point at your local GTFS files.

The application tables (`users`, `rides`, `ride_validations`, `train_stations`) were created directly in Supabase and are not part of these SQL files.

### Run

```bash
npm start
```

The server starts on the configured port and prints `Server listening on port 3000`. Liveness check:

```bash
curl http://localhost:3000/health
```

### Connecting Yemot HaMashiach

1. Expose the server at a public address (`ngrok` in development; a domain with HTTPS in production).
2. In the Yemot extension, set `api_url` to `https://your-domain/ivr/webhook/handleAll`.
3. Configure signature forwarding: `api_add_0=signature=<HMAC-SHA256 of ApiCallId:ApiPhone:ApiDID:ApiTime>`.
4. Add the system's DID number to `YEMOT_ALLOWED_DIDS`.

---

## Security

> [!WARNING]
> **This project was built as a conceptual demonstration for the Ministry of Transport, and its security was not hardened.** This section deliberately documents both what exists and what is missing, so the gaps are visible to anyone reviewing the system.

### What is implemented

The IVR request authentication layer (`yemotAuthMiddleware`) performs these checks, in order:

| Layer | Check |
| --- | --- |
| Request origin | `User-Agent` must contain `yemot-core-api` |
| Request completeness | Presence of `ApiCallId`, `ApiPhone`, `ApiDID`, `ApiTime` |
| Allowlist | `ApiDID` must appear in `YEMOT_ALLOWED_DIDS` |
| Replay protection | A time window of 5 minutes in the past and 60 seconds into the future only |
| Digital signature | HMAC-SHA256 over `ApiCallId:ApiPhone:ApiDID:ApiTime`, compared with `timingSafeEqual` |
| Rate limiting | 20 requests per minute per phone number |

In addition: `x-powered-by` is disabled, the request body is capped at 1 MB, passwords are hashed with bcrypt, secrets live in a `.env` excluded from Git, and registration/login input is validated with Zod.

### What is missing and must be addressed before production

- **The REST API is completely exposed.** `/api/trips`, `/api/gtfs`, `/api/payments`, `/api/users` and `/api/validation` carry no authentication whatsoever — no JWT, no session, no authorisation. Anyone who knows the URL can create a ride or read data.
- **Authentication and user management are not implemented.** `login`, `logout` and `AuthService` are stubs; no tokens are issued and no password is actually checked.
- **No inspector authorisation.** `inspectorId` is taken from a URL parameter with no proof of identity.
- **Identity rests entirely on `ApiPhone`.** The signature prevents direct forgery, but there is no second factor (a PIN, a one-time code) to stop misuse of someone else's number.
- **`SUPABASE_SERVICE_ROLE_KEY` grants full access** and bypasses RLS policies. Production needs RLS enabled and a least-privilege key.
- **Low-entropy confirmation codes.** Five random digits (`Math.random`) give only 90,000 possibilities, with no cryptographic binding to the passenger and no limit on validation attempts — guessing a valid code is a practical attack.
- **No rate limiting on the REST API** — only on the IVR.
- **Logs contain full phone numbers and complete request bodies** — identifying data must be reduced and redacted.
- **No HTTPS at the application layer** — a TLS-terminating reverse proxy is required.
- **No automated security tests** — nothing verifies the authentication layers, and `npm test` is not configured.

---

## Scope of the Demonstration

What is in the code is the core flow the project set out to prove: an end-to-end voice call that ends in a valid ticket. The following were left out of scope **deliberately**, because they are not required to demonstrate feasibility:

| Not included | Explanation |
| --- | --- |
| **Actual payment collection** | A ride record is created with a calculated amount, but no money is charged. There is no integration with a payment processor, a digital wallet or the Rav-Kav system. |
| **Best-fare calculation and monthly passes** | Every ride is priced as a single fare. There is no monthly accrual, no comparison against a period pass and no fare capping — even though the ride records already hold all the data required for it. |
| **Dynamic fares** | Fare tiers are hard-coded rather than read from `fare_attributes`. There are no fare zones, eligibility discounts (student, senior, youth) or transfers between lines. |
| **Session persistence** | Call state lives in an in-process `Map`. A server restart wipes active calls, and the service cannot run multiple processes or sit behind a load balancer — Redis or a database is required. |
| **Cancellation and refunds** | There is no IVR path or API for cancelling a ride or issuing a refund. |
| **Inspector application** | A validation API exists, but no user interface was built for inspectors in the field. |
| **Multiple languages** | All prompts are Hebrew only. Arabic, Russian and English are required for public deployment. |
| **Automated tests** | `npm test` is not configured. There are no unit tests for the state machine or the fare calculation. |

Information-security gaps are documented separately and in full under [Security](#security).

## Open Code Tasks

Items identified in the code and not yet closed. They are documented here in full transparency, and none of them blocks the demonstration of the core flow:

| Item | Status |
| --- | --- |
| **Specific-stop selection path** | In `handleBoardingCodeEntry` the line that stores the boarding stop in the session is commented out, and `clearSession()` runs in its place. As a result, after entering the boarding stop the call returns to the main menu instead of advancing to the alighting stop. **The "full journey" path — the one used in the demonstration — works correctly.** |
| **Consolidating the FSM files** | The active state machine sits in `Services/try.ts`, a placeholder name from development, while `IVRService.ts` holds an earlier version that is entirely commented out. These should be merged and renamed. |
| **Mounting the validation router** | `validationRoutes.ts` is implemented but not registered in `app.ts`, so the `/api/validation/*` paths are not actually reachable. A one-line fix. |
| **`&hangup=yes` instead of a newline** | The bus success messages emit `&hangup=yes` rather than the `\nhangup=yes` used everywhere else — this needs verifying against Yemot's actual behaviour. |
| **Train route existence check** | The call to `find_train_trip_between_stops` is intentionally commented out to allow demonstration without complete timetable data. The consequence is that a journey can be created between two stations even when no trip connects them. |
| **Train regions hard-coded** | The `stop_id` lists for the four regions are maintained by hand; a change to the rail network requires a code edit rather than a data update. |
| **Multi-operator lines** | Handling is implemented but has not been exercised against every real-world case where the same line number is run by different companies in different areas. |

---

## Roadmap

The steps required to turn the demonstration into a production system:

1. **Security** — JWT/OAuth across the REST API, inspector authorisation, RLS in Supabase, least-privilege keys, cryptographically strong confirmation codes.
2. **Real payment** — integration with a payment processor or wallet, Rav-Kav linkage, consolidated billing, receipts.
3. **Best-fare calculation and monthly passes** — accrue each passenger's monthly rides, automatically compare the total of individual fares against the price of a period pass, charge whichever is cheaper, and apply daily and monthly capping. This is the component that puts the phone-based passenger on equal terms with the smartphone owner, and the existing `rides` records are already the foundation for it.
4. **Persistence and capacity** — sessions in Redis, multi-process deployment, distributed rate limiting, monitoring and alerting.
5. **Completing the flow** — fix the stop-selection path, mount the validation router, add ride cancellation and refunds.
6. **Inspector application** — a mobile interface for scanning or entering a code, with validation logging.
7. **Dynamic fares** — read from `fare_attributes`, support fare zones and eligibility discounts (student, senior, youth).
8. **Testing** — unit tests for the state machine and fare calculation, plus integration tests that simulate a complete call.
9. **Accessibility and languages** — prompts in Arabic, Russian and English; adjustable speech rate and repetition for older passengers.

---

## Licence and Credits

Built by [binyamin-zaidman](https://github.com/binyamin-zaidman) as a prototype for presenting the concept to the Israeli Ministry of Transport.

Public transport data is based on the open GTFS feed published by the Israeli Ministry of Transport.
