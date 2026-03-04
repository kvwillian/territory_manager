# Territory Manager

A Flutter mobile application for congregation territory management. Helps conductors and admins track preaching territories, segment progress, meeting locations, and work sessions.

## Features

- **Territory management** – Create and edit territories with neighborhoods, images, maps links, and street-level segments
- **Segment tracking** – Mark segments as completed during field service; track progress per territory
- **Meeting locations** – Configure meeting locations (Casas de Saída) with coordinates and allowed territories
- **Preaching sessions** – Define weekly sessions with meeting locations and conductors
- **Work sessions** – Record territory work with conductor, date, and completed segments
- **Offline support** – Full offline persistence; territories, segments, meeting locations, and preaching sessions cached locally
- **Image caching** – Territory images cached locally for fast loading and offline access
- **Roles** – Admin (full management) and Conductor (view assigned territory, save progress)

## Tech Stack

- **Flutter** – Cross-platform mobile
- **Riverpod** – State management
- **Firebase** – Firestore, Auth, Storage, Cloud Functions
- **Drift** – Local SQLite for offline persistence
- **Go Router** – Navigation

## Getting Started

### Prerequisites

- Flutter SDK (^3.10.8)
- Firebase project (for production)
- Android Studio / Xcode (for mobile builds)

### Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:kvwillian/territory_manager.git
   cd territory_manager
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Configure Firebase (optional for demo):
   - Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
   - Or use the built-in **Demo** login to try the app without Firebase

4. Run the app:
   ```bash
   flutter run
   ```

### Demo Mode

Use **Demo** or **Demo Admin** on the login screen to explore the app without Firebase. Demo data is in-memory only.

## Project Structure

```
lib/
├── core/           # Database, services, constants, theme
├── features/
│   ├── admin/      # Admin UI, territory/assignment management
│   ├── auth/       # Authentication
│   ├── conductor/  # Conductor UI, territory progress
│   ├── meetings/   # Meeting locations, preaching sessions
│   ├── territories/# Territory and segment models/repos
│   └── assignments/# Work sessions, assignments
├── shared/         # Shared widgets
└── app/            # Router, shell
```

## Offline Behavior

- **First login**: Data is synced from Firestore to local SQLite
- **Online**: Reads from local cache; background refresh from Firestore
- **Offline**: Reads from local cache; writes queued and synced when back online
- **Segment progress**: Saved locally immediately; synced when connected

## Language

- **UI**: Portuguese (BR)
- **Code**: English

## License

Private – congregation use.
