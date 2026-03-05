import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/congregation_constants.dart';
import '../../../core/database/local_repository.dart';
import '../../../core/services/connectivity_service.dart';
import '../../../core/services/offline_sync_service.dart';
import '../../meetings/models/preaching_session_model.dart';
import '../../meetings/providers/preaching_session_repository_provider.dart';
import '../models/assignment_model.dart';
import 'assignment_repository.dart';
import '../../admin/data/mock_territory_repository.dart';

/// Assignment repository with offline-first support.
/// Reads from local first; writes go to local immediately and Firestore when online.
class OfflineAssignmentRepository implements AssignmentRepository {
  OfflineAssignmentRepository({
    required this.remote,
    required this.local,
    required this.connectivity,
    required this.offlineSync,
    required this.onInvalidate,
    this.onReadFromCache,
    this.congregationId,
    required this.ref,
  });

  final AssignmentRepository remote;
  final LocalRepository local;
  final ConnectivityService connectivity;
  final OfflineSyncService offlineSync;
  final VoidCallback onInvalidate;
  final VoidCallback? onReadFromCache;
  final String? congregationId;
  final Ref ref;

  String get _cid => congregationId ?? defaultCongregationId;

  Future<void> _upsertLocal(AssignmentModel a) async {
    final map = a.toMap();
    map['congregationId'] = a.congregationId ?? _cid;
    await local.upsertAssignments([map]);
  }

  @override
  Future<List<AssignmentModel>> getAssignments() async {
    if (kIsWeb) return remote.getAssignments();

    final maps = await local.getAssignments(_cid);
    if (maps.isNotEmpty) {
      onReadFromCache?.call();
      return maps.map((m) => AssignmentModel.fromMap(m)).toList();
    }

    final list = await remote.getAssignments();
    if (list.isNotEmpty) {
      final toUpsert = list.map((a) {
        final m = a.toMap();
        m['congregationId'] = a.congregationId ?? _cid;
        return m;
      }).toList();
      await local.upsertAssignments(toUpsert);
    }
    return list;
  }

  @override
  Future<List<AssignmentModel>> getAssignmentsForWeek(DateTime weekStart) async {
    final all = await getAssignments();
    final weekEnd = weekStart.add(const Duration(days: 7));
    return all
        .where((a) =>
            !a.date.isBefore(weekStart) && a.date.isBefore(weekEnd))
        .toList();
  }

  @override
  Future<AssignmentModel?> getAssignmentForDate(DateTime date) async {
    final all = await getAssignments();
    final normalized = DateTime(date.year, date.month, date.day);
    try {
      return all.firstWhere((a) =>
          DateTime(a.date.year, a.date.month, a.date.day) == normalized);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> saveAssignment(AssignmentModel assignment) async {
    final online = await connectivity.isOnline;
    final existing = await local.getAssignmentById(assignment.id);

    await _upsertLocal(assignment);
    onInvalidate();

    if (online) {
      try {
        await remote.saveAssignment(assignment);
      } catch (e) {
        if (existing != null) {
          await offlineSync.queueUpdateAssignment(assignment);
        } else {
          await offlineSync.queueCreateAssignment(assignment);
        }
      }
    } else {
      if (existing != null) {
        await offlineSync.queueUpdateAssignment(assignment);
      } else {
        await offlineSync.queueCreateAssignment(assignment);
      }
    }
  }

  @override
  Future<void> deleteAssignment(String id) async {
    await local.deleteAssignment(id);
    onInvalidate();

    final online = await connectivity.isOnline;
    if (online) {
      try {
        await remote.deleteAssignment(id);
      } catch (e) {
        await offlineSync.queueDeleteAssignment(id);
      }
    } else {
      await offlineSync.queueDeleteAssignment(id);
    }
  }

  static int _dayOffset(DayOfWeek day) {
    switch (day) {
      case DayOfWeek.tuesday:
        return 1;
      case DayOfWeek.wednesday:
        return 2;
      case DayOfWeek.thursday:
        return 3;
      case DayOfWeek.friday:
        return 4;
      case DayOfWeek.saturday:
        return 5;
      case DayOfWeek.sunday:
        return 6;
    }
  }

  @override
  Future<void> generateAssignments(DateTime weekStart) async {
    final territories =
        await ref.read(territoryRepositoryProvider).getTerritories();
    final sessions =
        await ref.read(preachingSessionRepositoryProvider).getPreachingSessions();
    if (territories.isEmpty || sessions.isEmpty) return;

    final existing = await getAssignmentsForWeek(weekStart);
    if (existing.isNotEmpty) return;

    var territoryIndex = 0;
    for (var i = 0; i < sessions.length; i++) {
      final session = sessions[i];
      final date = weekStart.add(Duration(days: _dayOffset(session.dayOfWeek)));
      final conductorId =
          session.conductorIds.isNotEmpty ? session.conductorIds.first : null;
      final territory = territories[territoryIndex % territories.length];
      final assignment = AssignmentModel(
        id: 'a${DateTime.now().millisecondsSinceEpoch}_$i',
        date: date,
        conductorId: conductorId,
        meetingLocationId: session.meetingLocationId,
        territoryIds: [territory.id],
        preachingSessionId: session.id,
        congregationId: _cid,
      );
      await saveAssignment(assignment);
      territoryIndex++;
    }
  }
}
