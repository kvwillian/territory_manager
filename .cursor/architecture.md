# System Architecture

## Overview

The Territory Manager system is designed as a mobile-first application built with Flutter and backed by Firebase services.

The architecture prioritizes:

- clear domain separation
- scalability
- strong auditability
- geographic data handling
- automation support

The system must also allow exporting historical reports and performing audits on territory usage.

---

# Architecture Principles

The system follows these principles:

1. Domain Driven Structure
2. Feature-based modular organization
3. Immutable work history
4. Strong audit logging
5. Clear separation between UI, services and data layer

---

# High Level Architecture

Client (Flutter App)

↓

Application Layer (Services / Business Logic)

↓

Data Layer (Repositories)

↓

Backend Services

- Firebase Auth
- Firestore Database
- Cloud Functions
- Storage (optional)

---

# Client Architecture

The Flutter app follows a **feature-first structure**.

Each feature contains its own:

- models
- services
- UI
- repositories

This improves maintainability and allows the codebase to grow safely.

Example:

lib/

core  
features  
shared

---

# Core Layer

Contains application-wide utilities.

core/

constants  
utils  
extensions  
config

Example utilities:

distance_calculator.dart  
date_utils.dart  
geo_utils.dart

---

# Feature Modules

The application is divided into the following domains.

auth  
territories  
segments  
assignments  
meetings  
map  
admin  
conductor  
reports  
audit

---

# Auth Module

Handles authentication and role management.

Responsibilities:

- login
- user roles
- permissions

Roles:

Admin  
Conductor

Admins have full configuration access.

Conductors can only update worked segments.

---

# Territory Module

Responsible for managing territories.

Responsibilities:

- territory creation
- territory editing
- territory polygons
- centroid calculation
- territory metadata

Each territory includes:

- polygon
- centroid
- neighborhood
- list of streets

---

# Segment Module

Segments represent the smallest workable portion of a territory.

Responsibilities:

- storing segment geometry
- tracking segment status
- tracking last work date
- maintaining segment history

Segments are rendered on the map.

Segment states:

PENDING  
PARTIAL  
COMPLETED

---

# Meeting Locations Module

Represents houses where preaching sessions start.

Responsibilities:

- storing meeting coordinates
- defining territory radius
- defining allowed territories

Each meeting location contains:

name  
coordinates  
radiusMeters  
allowedTerritories

---

# Assignment Module

Handles territory assignments for preaching sessions.

Responsibilities:

- generate weekly assignments
- store assignment history
- enforce territory rotation rules

Assignments include:

date  
groupId  
territoryId

---

# Suggestion Engine

The suggestion engine calculates the best territory for each session.

Filtering:

1. territories within meeting radius
2. territories allowed by configuration
3. territories not recently assigned to same group

Scoring factors:

distance  
pendingSegments  
daysSinceLastWorked

Final score determines suggestion priority.

---

# Map Module

Responsible for geographic visualization.

Uses:

google_maps_flutter

Responsibilities:

- render territory polygons
- render segment polygons
- show meeting locations
- show radius overlays

Segment colors indicate status.

---

# Conductor Module

Used during preaching sessions.

Responsibilities:

- show assigned territory
- display map
- allow marking segments worked
- submit work session

Conductors cannot edit territories.

---

# Admin Module

Used for system configuration.

Responsibilities:

- territory management
- segment editing
- meeting location setup
- weekly assignment generation

Admins also have access to reports and audit logs.

---

# Reporting System

The system must support exporting operational reports.

Reports may include:

territory coverage reports  
territory history reports  
group assignment history  
segment completion statistics

Exports should support:

CSV  
PDF (future)

Reports will be generated either:

client-side  
or via Cloud Functions for large datasets.

---

# Audit System

Auditing is a critical requirement.

All important operations must be logged.

Examples of audited actions:

territory creation  
territory modification  
segment status updates  
assignment generation  
manual assignment overrides

Audit entries must be immutable.

---

# Audit Log Structure

AuditLog

id  
timestamp  
userId  
actionType  
entityType  
entityId  
beforeState  
afterState  
metadata

Example action types:

CREATE_TERRITORY  
UPDATE_SEGMENT  
GENERATE_ASSIGNMENTS  
MANUAL_OVERRIDE

---

# Work Session Logging

Every preaching session should generate a WorkSession record.

WorkSession

id  
date  
conductorId  
territoryId  
segmentsWorked  
notes

This provides historical traceability.

---

# Firestore Collections

users  
territories  
streets  
segments  
meetingLocations  
groups  
assignments  
workSessions  
auditLogs

---

# Cloud Functions

Cloud Functions may be used for:

weekly assignment generation  
report generation  
data consistency checks

Benefits:

centralized business logic  
secure operations  
reduced client complexity

---

# Security Model

Firestore rules must enforce:

Admins

read/write configuration

Conductors

read territories  
update segments worked  
create workSessions

Conductors cannot modify:

territory definitions  
meeting locations  
assignment history

---

# Map Geometry Handling

Territory polygons and segment polygons are stored as:

arrays of coordinates.

Example:

[
  {lat: -23.45, lng: -47.47},
  {lat: -23.46, lng: -47.48}
]

The centroid of each territory is calculated when saved.

Centroid is used for proximity calculations.

---

# Assignment Generation Flow

Admin presses "Generate Weekly Assignments"

System:

1 load sessions  
2 load territories  
3 filter territories by meeting radius  
4 remove recently used territories  
5 compute score  
6 generate suggestions  
7 store assignments  

Admin can manually override.

---

# Scalability Considerations

The system should support:

multiple congregations in the future.

Recommended structure:

congregations collection

All entities linked by:

congregationId

Example:

territories

congregationId  
name  
polygon

---

# Offline Support (Future)

Flutter app may cache:

territories  
segments  
assignments

This allows use in areas with weak signal.

---

# Long Term Vision

The architecture should support:

multi-congregation support  
territory heatmaps  
advanced analytics  
revisit tracking  
territory sharing between congregations