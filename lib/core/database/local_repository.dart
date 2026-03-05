import 'dart:convert';

import 'package:drift/drift.dart';

import 'app_database.dart';

/// Local repository for caching Firestore data.
/// Stores JSON blobs with id, congregationId, lastUpdatedAt.
class LocalRepository {
  LocalRepository(this._db);

  final AppDatabase _db;

  // ---- Territories ----
  Future<void> upsertTerritories(List<Map<String, dynamic>> items) async {
    if (items.isEmpty) return;
    final now = DateTime.now();
    await _db.batch((batch) {
      for (final item in items) {
        final id = item['id'] as String? ?? '';
        if (id.isEmpty) continue;
        final congregationId = item['congregationId'] as String?;
        final jsonStr = jsonEncode(item);
        batch.insert(
          _db.territories,
          TerritoriesCompanion.insert(
            id: id,
            congregationId: Value(congregationId),
            json: jsonStr,
            lastUpdatedAt: now,
          ),
          mode: InsertMode.insertOrReplace,
        );
      }
    });
  }

  Future<List<Map<String, dynamic>>> getTerritories(String? congregationId) async {
    var query = _db.select(_db.territories);
    if (congregationId != null && congregationId.isNotEmpty) {
      query = query..where((t) => t.congregationId.equals(congregationId));
    }
    final rows = await query.get();
    return rows.map((r) => jsonDecode(r.json) as Map<String, dynamic>).toList();
  }

  Future<Map<String, dynamic>?> getTerritoryById(String id) async {
    final row = await (_db.select(_db.territories)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    return row != null ? jsonDecode(row.json) as Map<String, dynamic> : null;
  }

  Future<void> deleteTerritory(String id) async {
    await (_db.delete(_db.territories)..where((t) => t.id.equals(id))).go();
  }

  // ---- Segments ----
  Future<void> upsertSegments(List<Map<String, dynamic>> items) async {
    if (items.isEmpty) return;
    final now = DateTime.now();
    await _db.batch((batch) {
      for (final item in items) {
        final id = item['id'] as String? ?? '';
        if (id.isEmpty) continue;
        final territoryId = item['territoryId'] as String? ?? '';
        final congregationId = item['congregationId'] as String?;
        final jsonStr = jsonEncode(item);
        batch.insert(
          _db.segments,
          SegmentsCompanion.insert(
            id: id,
            territoryId: territoryId,
            congregationId: Value(congregationId),
            json: jsonStr,
            lastUpdatedAt: now,
          ),
          mode: InsertMode.insertOrReplace,
        );
      }
    });
  }

  Future<List<Map<String, dynamic>>> getSegmentsByTerritory(String territoryId) async {
    final rows = await (_db.select(_db.segments)
          ..where((s) => s.territoryId.equals(territoryId)))
        .get();
    return rows.map((r) => jsonDecode(r.json) as Map<String, dynamic>).toList();
  }

  Future<void> deleteSegmentsByTerritory(String territoryId) async {
    await (_db.delete(_db.segments)
          ..where((s) => s.territoryId.equals(territoryId)))
        .go();
  }

  /// Updates segment statuses in local cache (for offline progress save).
  Future<void> updateSegmentStatuses(
    String territoryId,
    Map<String, String> statusBySegmentId,
  ) async {
    final rows = await (_db.select(_db.segments)
          ..where((s) => s.territoryId.equals(territoryId)))
        .get();
    final now = DateTime.now();
    for (final row in rows) {
      final status = statusBySegmentId[row.id];
      if (status == null) continue;
      final map = jsonDecode(row.json) as Map<String, dynamic>;
      map['status'] = status;
      map['lastWorkedDate'] =
          status == 'completed' ? DateTime.now().toIso8601String() : null;
      await (_db.update(_db.segments)..where((s) => s.id.equals(row.id))).write(
            SegmentsCompanion(
              json: Value(jsonEncode(map)),
              lastUpdatedAt: Value(now),
            ),
          );
    }
  }

  // ---- Meeting Locations ----
  Future<void> upsertMeetingLocations(List<Map<String, dynamic>> items) async {
    if (items.isEmpty) return;
    final now = DateTime.now();
    await _db.batch((batch) {
      for (final item in items) {
        final id = item['id'] as String? ?? '';
        if (id.isEmpty) continue;
        final congregationId = item['congregationId'] as String?;
        final jsonStr = jsonEncode(item);
        batch.insert(
          _db.meetingLocations,
          MeetingLocationsCompanion.insert(
            id: id,
            congregationId: Value(congregationId),
            json: jsonStr,
            lastUpdatedAt: now,
          ),
          mode: InsertMode.insertOrReplace,
        );
      }
    });
  }

  Future<List<Map<String, dynamic>>> getMeetingLocations(String? congregationId) async {
    var query = _db.select(_db.meetingLocations);
    if (congregationId != null && congregationId.isNotEmpty) {
      query = query..where((m) => m.congregationId.equals(congregationId));
    }
    final rows = await query.get();
    return rows.map((r) => jsonDecode(r.json) as Map<String, dynamic>).toList();
  }

  Future<Map<String, dynamic>?> getMeetingLocationById(String id) async {
    final row = await (_db.select(_db.meetingLocations)
          ..where((m) => m.id.equals(id)))
        .getSingleOrNull();
    return row != null ? jsonDecode(row.json) as Map<String, dynamic> : null;
  }

  Future<void> deleteMeetingLocation(String id) async {
    await (_db.delete(_db.meetingLocations)..where((m) => m.id.equals(id))).go();
  }

  // ---- Preaching Sessions ----
  Future<void> upsertPreachingSessions(List<Map<String, dynamic>> items) async {
    if (items.isEmpty) return;
    final now = DateTime.now();
    await _db.batch((batch) {
      for (final item in items) {
        final id = item['id'] as String? ?? '';
        if (id.isEmpty) continue;
        final congregationId = item['congregationId'] as String?;
        final jsonStr = jsonEncode(item);
        batch.insert(
          _db.preachingSessions,
          PreachingSessionsCompanion.insert(
            id: id,
            congregationId: Value(congregationId),
            json: jsonStr,
            lastUpdatedAt: now,
          ),
          mode: InsertMode.insertOrReplace,
        );
      }
    });
  }

  Future<List<Map<String, dynamic>>> getPreachingSessions(String? congregationId) async {
    var query = _db.select(_db.preachingSessions);
    if (congregationId != null && congregationId.isNotEmpty) {
      query = query..where((p) => p.congregationId.equals(congregationId));
    }
    final rows = await query.get();
    return rows.map((r) => jsonDecode(r.json) as Map<String, dynamic>).toList();
  }

  Future<List<Map<String, dynamic>>> getPreachingSessionsByMeetingLocation(
    String meetingLocationId,
  ) async {
    final rows = await _db.select(_db.preachingSessions).get();
    return rows
        .map((r) => jsonDecode(r.json) as Map<String, dynamic>)
        .where((m) => m['meetingLocationId'] == meetingLocationId)
        .toList();
  }

  Future<void> deletePreachingSession(String id) async {
    await (_db.delete(_db.preachingSessions)..where((p) => p.id.equals(id))).go();
  }

  // ---- Assignments ----
  Future<void> upsertAssignments(List<Map<String, dynamic>> items) async {
    if (items.isEmpty) return;
    final now = DateTime.now();
    await _db.batch((batch) {
      for (final item in items) {
        final id = item['id'] as String? ?? '';
        if (id.isEmpty) continue;
        final congregationId = item['congregationId'] as String?;
        final jsonStr = jsonEncode(item);
        batch.insert(
          _db.assignments,
          AssignmentsCompanion.insert(
            id: id,
            congregationId: Value(congregationId),
            json: jsonStr,
            lastUpdatedAt: now,
          ),
          mode: InsertMode.insertOrReplace,
        );
      }
    });
  }

  Future<List<Map<String, dynamic>>> getAssignments(String? congregationId) async {
    var query = _db.select(_db.assignments);
    if (congregationId != null && congregationId.isNotEmpty) {
      query = query..where((a) => a.congregationId.equals(congregationId));
    }
    final rows = await query.get();
    return rows.map((r) => jsonDecode(r.json) as Map<String, dynamic>).toList();
  }

  Future<Map<String, dynamic>?> getAssignmentById(String id) async {
    final row = await (_db.select(_db.assignments)..where((a) => a.id.equals(id)))
        .getSingleOrNull();
    return row != null ? jsonDecode(row.json) as Map<String, dynamic> : null;
  }

  Future<void> deleteAssignment(String id) async {
    await (_db.delete(_db.assignments)..where((a) => a.id.equals(id))).go();
  }

  // ---- Sync Queue ----
  Future<void> enqueueSyncItem({
    required String operationType,
    required Map<String, dynamic> payload,
  }) async {
    await _db.into(_db.syncQueue).insert(
          SyncQueueCompanion.insert(
            operationType: operationType,
            payload: jsonEncode(payload),
            timestamp: DateTime.now(),
          ),
        );
  }

  Future<int> getPendingSyncItemsCount() async {
    final rows = await _db.select(_db.syncQueue).get();
    return rows.length;
  }

  Future<List<SyncQueueItem>> getPendingSyncItems() async {
    final rows = await _db.select(_db.syncQueue).get();
    return rows
        .map(
          (r) => SyncQueueItem(
            id: r.id,
            operationType: r.operationType,
            payload: jsonDecode(r.payload) as Map<String, dynamic>,
            timestamp: r.timestamp,
          ),
        )
        .toList();
  }

  Future<void> removeSyncItem(int id) async {
    await (_db.delete(_db.syncQueue)..where((s) => s.id.equals(id))).go();
  }

  Future<bool> hasCachedData() async {
    final rows = await (_db.select(_db.territories)..limit(1)).get();
    return rows.isNotEmpty;
  }

  Future<void> clearAll() async {
    await _db.delete(_db.territories).go();
    await _db.delete(_db.segments).go();
    await _db.delete(_db.meetingLocations).go();
    await _db.delete(_db.preachingSessions).go();
    await _db.delete(_db.assignments).go();
  }
}

class SyncQueueItem {
  SyncQueueItem({
    required this.id,
    required this.operationType,
    required this.payload,
    required this.timestamp,
  });

  final int id;
  final String operationType;
  final Map<String, dynamic> payload;
  final DateTime timestamp;
}
