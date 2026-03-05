# Territory Manager – Congregation Territory Management App

## Overview

Territory Manager is a Flutter mobile application designed to help a congregation manage preaching territories more efficiently.

Currently, territory assignment and tracking are performed manually. This application digitizes the process and simplifies:

- territory assignment
- territory progress tracking
- weekly planning
- historical records

The primary goal is to help conductors quickly understand **which areas of a territory still need to be covered**.

The system is optimized for **simplicity and fast usage during field service**.

---

# Language Rule

All labels, texts, and user-facing strings in the app must be in **Portuguese (BR)**.  
Code (identifiers, variables, classes, comments) remains in **English**.

---

# Core Concept

A **territory** represents a small geographic area assigned for preaching work.

Territories are not always completed in a single session. Therefore, the system must support **partial completion tracking**.

Instead of tracking precise geographic polygons, the app tracks **street-level segments inside a territory**.

Each territory contains a list of segments that represent:

- a street
- a side of a street
- a small section of the territory

Segments can be marked as completed by conductors.

---

# Territory Representation

Each territory contains:

- territory name
- neighborhood name
- territory image (visual reference)
- Google Maps link for navigation
- list of segments

The territory image serves as a **visual reference of the area**.

When users need navigation, they can open the territory location directly in Google Maps.

---

# Segment Tracking

Segments represent the smallest unit of work inside a territory.

Examples:

- Rua A – left side
- Rua A – right side
- Rua B – block 1

Each segment has a status.

Segment status:

PENDING  
COMPLETED

Segments are displayed as a **checklist** in the territory screen.

Conductors mark segments as completed during field service.

---

# Preaching Sessions

The congregation has organized preaching sessions during the week.

Typical schedule:

Tuesday – fixed meeting location  
Wednesday – fixed meeting location  
Thursday – fixed meeting location  
Friday – fixed meeting location  
Saturday – fixed meeting location  
Sunday – multiple groups (example: 6 groups)

Each session starts at a **meeting location** (Casa de Saída).

---

# Meeting Locations

A meeting location represents where a group starts field service.

Each meeting location includes:

- name
- coordinates
- maximum territory radius
- optional list of allowed territories

Territory suggestions must prioritize areas close to the meeting location.

---

# Territory Suggestion System

The system can automatically suggest territories for a session.

Suggestions consider:

- distance from meeting location
- unfinished segments
- time since last worked
- avoiding repeated territories for the same group

Admins can accept or manually change suggestions.

---

# Rotation Rule

The system should avoid assigning the **same territory to the same group in consecutive weeks**.

Example:

Week 1  
Group A → Territory 12

Week 2  
Group A → Territory 12 (avoid)

---

# Work Sessions

Every preaching session may generate a **work session record**.

A work session includes:

- territory
- date
- conductor
- segments completed
- optional notes

This provides historical traceability.

---

# Roles

Two roles exist in the system.

Admin

Responsible for:

- managing territories
- managing segments
- configuring meeting locations
- generating weekly assignments

Conductor

Responsible for:

- viewing assigned territory
- marking segments as completed
- recording work sessions

Conductors cannot modify system configuration.

---

# Data Model (Conceptual)

User

- id
- name
- role

Territory

- id
- name
- neighborhood
- imageUrl
- mapsUrl
- latitude
- longitude

Segment

- id
- territoryId
- description
- status
- lastWorkedDate

MeetingLocation

- id
- name
- latitude
- longitude
- radiusMeters
- allowedTerritories

Assignment

- id
- date
- conductorId
- meetingLocationId
- territoryIds[]
- preachingSessionId (optional)

WorkSession

- id
- date
- conductorId
- territoryId
- segmentsWorked
- notes

---

# Technology Stack

Frontend

Flutter

State management

Riverpod

Backend

Firebase

Services:

Firestore  
Firebase Auth  
Firebase Storage  

Cloud Functions may be used for automation tasks.

---

# Project Structure

lib/

core/
utils

features/

auth/

territories/
models
repository
services
ui

assignments/

admin/

conductor/

shared/

widgets
theme

---

# Key Design Principle

The system must always prioritize:

1. Simplicity
2. Fast interaction
3. Clear progress visibility
4. Minimal configuration effort

The most important user experience is allowing conductors to quickly answer:

**"Which streets in this territory still need to be covered?"**