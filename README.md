# Territory Manager / Unio

A multi-congregation management platform consisting of a **Flutter mobile application**, a **React/Vite web portal (`apps/unio`)**, and **Firebase Cloud Functions (`functions/`)**. Designed to help congregation admins, secretaries, group superintendents, and conductors manage field service territories, meeting programs, publisher rosters, audio/video & cleaning schedules, and elderly support.

## Features

### Field Service & Territories (Mobile – Offline-First)
- **Territory management** – Create and edit territories with neighborhoods (`bairros`), cached images, Google Maps links, and street-level segments
- **Segment tracking** – Mark street segments as completed during field service and track territory coverage progress
- **Meeting locations & field groups** – Configure meeting locations (Casas de Saída), Sunday field groups, and weekly field service assignments
- **Work sessions** – Record territory work with conductor, date, and completed segments
- **Bulk territory history import** – Paste CSV (`docs/territorio_importacao_csv.md`) or free-text list to align manual records with segment completion and work sessions
- **Full offline support** – Territories, segments, meeting locations, and preaching sessions are stored locally in SQLite (Drift) with background sync and offline write queuing

### Congregation & Meeting Management (Unio Web & Mobile)
- **Congregation dashboard & agenda** – View congregation schedules, upcoming midweek/weekend meetings, announcements, and events
- **Meeting workbook PDF import** – Upload and parse meeting workbooks (`processMeetingImport`), automatically generate weekend meeting structures (`ensureWeekendMeetings`), and assign parts and duties (`saveMeetingProgram`)
- **Publisher & group directory** – Manage congregation publishers (`publishers`), privileges (`elder`, `ministerialServant`, `publisher`), pioneer status (`regular`, `auxiliary`, `none`), meeting duties (`indicador`, `volante`, `microfone`, `som`, `estudante`), and publisher groups (`publisherGroups`) with group superintendents
- **Audio & Video rosters** – Build monthly rosters for indicators, microphones, and sound desk (`audioVideoRosters`) and export formatted posters to **PDF**, **Word (`.docx`)**, or **Excel (`.xlsx`)**
- **Cleaning assignments** – Assign and publish meeting cleaning responsibilities (`cleaningAssignments`)
- **Elderly support schedules** – Coordinate drivers and elderly publishers needing transport/assistance for congregation meetings (`elderlySupportSchedules`)
- **Announcements & events** – Publish congregation announcements and dated events

### Security, Multi-Congregation & Accounts
- **Multi-congregation isolation** – Every business document is scoped by `congregationId` and enforced by Firestore Security Rules (`firestore.rules`) and Cloud Functions
- **Roles & granular permissions** – Supports `admin` and `conductor` roles alongside module-level `accessFlags` (`territories`, `publishers`, `meetings`, `reports`) and `manageFlags` (`meetings`, `elderlySupport`, `publishers`)
- **Self-service password reset** – Send a temporary password by email via Cloud Functions + [Resend](https://resend.com) and require choosing a new password on first login (`mustChangePassword`)

## Tech Stack

- **Mobile App (`lib/`)** – Flutter (`^3.10.8`), Riverpod, Go Router, Drift (SQLite), Cached Network Image
- **Web App (`apps/unio/`)** – React 19, TypeScript, Vite, Tailwind CSS v4, React Router, `pdf-lib`, `docx`, `exceljs`, `tesseract.js`
- **Backend (`functions/`)** – Firebase Cloud Functions (Node.js 20, TypeScript), Firebase Admin, `unpdf`, Resend API
- **Infrastructure** – Firebase Auth, Cloud Firestore, Firebase Storage, Firebase App Check

## Getting Started

### Prerequisites

- Flutter SDK (`^3.10.8`)
- Node.js 20+ (for `apps/unio` and `functions`)
- Firebase project (for production) or Firebase CLI (for emulators/deployment)
- Android Studio / Xcode (for mobile builds)

### 1. Mobile App (Flutter)

1. Install dependencies:
   ```bash
   flutter pub get
   ```

2. Configure Firebase (optional for demo):
   - Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS), or ensure `lib/firebase_options.dart` is present
   - Or use the built-in **Demo** / **Demo Admin** login on the login screen to explore the app with in-memory data

3. Run the app:
   ```bash
   flutter run
   ```

4. Run Flutter tests:
   ```bash
   flutter test
   ```

### 2. Unio Web Portal (`apps/unio`)

1. Install dependencies:
   ```bash
   cd apps/unio
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build or run tests:
   ```bash
   npm run build
   npm test
   ```

### 3. Cloud Functions (`functions`)

1. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

2. Build and run unit tests:
   ```bash
   npm run build
   npm test
   ```

3. Deploy functions:
   ```bash
   npm run deploy
   ```

### Self-Service Password Reset (Firebase + Resend)

The `requestPasswordReset` callable function generates a temporary password, sends it by email via Resend, and marks the user profile with `mustChangePassword: true` so the app prompts for a new password immediately after signing in. An HTTP confirmation endpoint (`confirmPasswordReset`) is also available.

1. Deploy Cloud Functions (`functions/`).
2. In **Google Cloud Console** → **Cloud Functions**, configure runtime environment variables:
   - `RESEND_API_KEY` (required in production)
   - `RESEND_FROM_EMAIL` (optional, e.g. `Nome <noreply@yourdomain.com>`; defaults to Resend's onboarding sender if unset)
3. Ensure **Cloud Functions Invoker** is granted to `allUsers` on public password-reset endpoints so unauthenticated users can request a reset.
4. For local emulator testing, place `RESEND_API_KEY` in `functions/.env` (loaded automatically via `dotenv`).

## Project Structure

```text
├── lib/                        # Flutter mobile/multiplatform app
│   ├── app/                    # GoRouter configuration & bottom-navigation shell
│   ├── core/                   # Drift SQLite database, offline sync services, theme, constants
│   ├── features/
│   │   ├── admin/              # Admin territory, user, assignment, and history management
│   │   ├── announcements/      # Congregation announcements and events
│   │   ├── assignments/        # Weekly field service assignments and work sessions
│   │   ├── auth/               # Authentication, user model, access/manage flags
│   │   ├── conductor/          # Conductor field service UI and territory progress
│   │   ├── congregations/      # Congregation details and meeting schedule settings
│   │   ├── designations/       # Audio/Video roster and cleaning assignment screens
│   │   ├── field_groups/       # Sunday field service groups
│   │   ├── history/            # Work session history widgets
│   │   ├── home/               # Dashboard (Início), Agenda, Maps, and Menu screens
│   │   ├── meeting_programs/   # Midweek & weekend meeting program models and providers
│   │   ├── meetings/           # Meeting locations (Casas de Saída) and preaching sessions
│   │   ├── neighborhoods/      # Neighborhoods (Bairros) CRUD
│   │   ├── onboarding/         # Welcome and account onboarding screens
│   │   ├── publisher_groups/   # Congregation publisher groups & superintendent views
│   │   ├── publishers/         # Congregation publishers CRUD and privileges
│   │   └── territories/        # Territory and street segment models, repositories, widgets
│   └── shared/                 # Shared UI components and shell helpers
├── apps/
│   └── unio/                   # React + TypeScript + Vite web portal
│       ├── src/
│       │   ├── components/     # Web app shell and shared components
│       │   ├── domain/         # Congregation, date, and template domain logic
│       │   └── features/       # Home, Meetings, Audio-Video, Cleaning, Elderly Support, Publishers
│       └── test/               # Web domain & export unit tests
├── functions/                  # Firebase Cloud Functions (TypeScript)
│   ├── src/
│   │   ├── boards/             # Meeting program, Audio/Video roster, and cleaning mutations
│   │   ├── elderlySupport/     # Elderly support schedule functions
│   │   ├── meetingWorkbook/    # PDF workbook parser, layout, and policies
│   │   ├── publishers/         # Publisher and congregation group functions
│   │   ├── meetingImport.ts    # Workbook import pipeline and weekend meeting generator
│   │   └── index.ts            # Auth/user callables and function exports
│   └── test/                   # Cloud Functions unit tests
├── docs/                       # Architecture plans, CSV import guide, and web-to-Flutter handoff
├── firestore.rules             # Multi-congregation and role-based Firestore security rules
└── storage.rules               # Firebase Storage security rules
```

## Offline & Sync Behavior

- **Territory domain (Offline-first via Drift):**
  - **First login:** Syncs territories, segments, meeting locations, and preaching sessions from Firestore to local SQLite
  - **Online:** Reads from local cache with background refresh from Firestore
  - **Offline:** Reads from local cache; segment progress and work sessions are saved locally immediately and queued for synchronization when connectivity returns
- **Congregation secretariat domain (Online + local drafts on web):**
  - Publishers, groups, meeting programs, audio/video rosters, cleaning assignments, and elderly support read from Firestore and write through validated Cloud Functions
  - In the Unio web app, unsent edits to meetings, audio/video rosters, and cleaning assignments are preserved in `localStorage` drafts until explicitly published/sent

## Language Conventions

- **User Interface**: Portuguese (pt-BR)
- **Code & Identifiers**: English

## License

Private – congregation use.
