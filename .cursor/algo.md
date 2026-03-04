# Territory Assignment Algorithm

## Overview

The territory suggestion engine is responsible for recommending the most appropriate territory for each preaching session.

The algorithm must consider operational constraints and prioritize territories that:

- are geographically close to the meeting location
- contain unfinished segments
- have not been worked recently
- were not assigned to the same group recently

The algorithm must always prioritize **practicality for the field service arrangement**.

---

# Core Algorithm Goals

The system should:

1. Suggest territories near the meeting location
2. Avoid assigning the same territory to the same group in consecutive weeks
3. Prefer finishing partially completed territories
4. Avoid leaving territories partially covered indefinitely
5. Balance territory coverage across the congregation area

---

# Territory Eligibility Filtering

Before scoring territories, the algorithm must filter out invalid options.

The filtering steps are applied in order.

---

## Step 1 – Distance Filtering

Each meeting location has:

- coordinates
- maximum working radius

Only territories within this radius are eligible.

Distance is calculated using the **Haversine formula** between:

meetingLocation.center  
territory.centroid

If:

distance > meetingLocation.radiusMeters

then the territory is excluded.

---

## Step 2 – Allowed Territories Filter

Meeting locations may optionally define a list of allowed territories.

If `allowedTerritories` is defined:

only territories within this list are eligible.

This allows administrators to manually constrain possible areas.

---

## Step 3 – Rotation Rule

The same group should not receive the same territory in consecutive weeks.

Algorithm rule:

if territory was assigned to group within last 7 days

apply **heavy penalty or exclusion**.

Recommended behavior:

exclude territory if assigned in the previous week.

Fallback:

if no territories remain after filtering, allow with strong penalty.

---

# Territory Priority Score

After filtering, the system calculates a priority score.

Higher score = better suggestion.

The score is composed of multiple weighted factors.

---

## Score Components

### Distance Score

Closer territories should be preferred.

distanceScore = 1 / distanceMeters

Closer territories produce higher scores.

---

### Pending Segments Score

Territories with unfinished segments should be prioritized.

pendingSegmentsScore = numberOfPendingSegments

This encourages finishing territories before starting new ones.

---

### Recency Score

Territories that have not been worked recently should be prioritized.

daysSinceLastWorked = today - territory.lastWorkedDate

recencyScore = daysSinceLastWorked

---

### Completion Boost

Territories that are **almost finished** should receive a bonus.

Example:

if remainingSegments <= 2

completionBoost = HIGH

This helps prevent territories from remaining unfinished.

---

# Final Score Formula

Example conceptual formula:

score =
(distanceWeight * distanceScore)
+
(pendingSegmentsWeight * pendingSegmentsScore)
+
(recencyWeight * recencyScore)
+
completionBoost

Example weights:

distanceWeight = 5  
pendingSegmentsWeight = 3  
recencyWeight = 2

Weights should be configurable in the future.

---

# Weekly Assignment Generation

Assignments are generated per session.

A session represents:

- a specific date
- a group
- a meeting location

Example:

Thursday evening group  
Meeting point: Sister Gloria house

---

# Assignment Generation Steps

For each session:

1 load meeting location  
2 load territories  
3 apply distance filter  
4 apply allowed territories filter  
5 apply rotation rule  
6 compute score for remaining territories  
7 sort territories by score  
8 select highest scoring territory  

Once selected, the territory is marked as **reserved for that week**.

This prevents duplicate assignments.

---

# Segment-Level Considerations

Territories may contain partially worked segments.

The algorithm should detect:

- territories with unfinished segments
- territories almost completed

Priority order recommendation:

1 territories with few remaining segments  
2 territories with many pending segments  
3 untouched territories  

This ensures natural territory progression.

---

# Handling Partial Coverage

If a territory has been partially covered, the system should encourage completion.

Example:

Territory A

6 segments total

4 completed  
2 pending

This territory should receive higher priority than a completely untouched territory.

---

# Conflict Prevention

When generating multiple assignments (example Sunday groups), the system must avoid assigning overlapping or extremely close territories.

Recommended rule:

selected territories must be at least a minimum distance apart.

Example:

minimumDistanceBetweenTerritories = 300 meters

This prevents groups from accidentally covering the same streets.

---

# Pseudocode

Example simplified algorithm.
