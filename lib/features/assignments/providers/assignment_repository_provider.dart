import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/local_repository.dart';
import '../../../core/providers/invalidation_callbacks.dart';
import '../../../core/services/connectivity_service.dart';
import '../../../core/services/offline_sync_service.dart';
import '../../admin/data/mock_territory_repository.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../../meetings/models/preaching_session_model.dart';
import '../../meetings/providers/preaching_session_repository_provider.dart';
import '../models/assignment_model.dart';
import '../repositories/assignment_repository.dart';
import '../repositories/firestore_assignment_repository.dart';
import '../repositories/offline_assignment_repository.dart';

final assignmentRepositoryProvider = Provider<AssignmentRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';

  if (useFirestore && !kIsWeb) {
    final db = ref.watch(appDatabaseProvider);
    if (db != null) {
      return OfflineAssignmentRepository(
        remote: FirestoreAssignmentRepository(
          ref.watch(currentCongregationProvider),
        ),
        local: LocalRepository(db),
        connectivity: ConnectivityService(),
        offlineSync: ref.read(offlineSyncServiceProvider),
        onInvalidate: () => invalidateAssignments?.call(),
        onReadFromCache: () => ref
            .read(offlineSyncServiceProvider)
            .refreshFromFirestore()
            .then((didRefresh) {
              if (didRefresh) invalidateAssignments?.call();
            }),
        congregationId: ref.watch(currentCongregationProvider),
        ref: ref,
      );
    }
  }

  if (useFirestore) {
    return FirestoreAssignmentRepository(
      ref.watch(currentCongregationProvider),
    );
  }

  return _DemoAssignmentRepository(ref);
});

/// Minimal repository for demo user - in-memory only.
class _DemoAssignmentRepository implements AssignmentRepository {
  _DemoAssignmentRepository(this._ref);

  final Ref _ref;
  final List<AssignmentModel> _assignments = [];

  @override
  Future<List<AssignmentModel>> getAssignments() async =>
      List.from(_assignments);

  @override
  Future<List<AssignmentModel>> getAssignmentsForWeek(DateTime weekStart) async {
    final weekEnd = weekStart.add(const Duration(days: 7));
    return _assignments
        .where((a) =>
            !a.date.isBefore(weekStart) && a.date.isBefore(weekEnd))
        .toList();
  }

  @override
  Future<AssignmentModel?> getAssignmentForDate(DateTime date) async {
    final normalized = DateTime(date.year, date.month, date.day);
    try {
      return _assignments.firstWhere((a) =>
          DateTime(a.date.year, a.date.month, a.date.day) == normalized);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> saveAssignment(AssignmentModel assignment) async {
    final index = _assignments.indexWhere((a) => a.id == assignment.id);
    if (index >= 0) {
      _assignments[index] = assignment;
    } else {
      _assignments.add(assignment);
    }
  }

  @override
  Future<void> deleteAssignment(String id) async {
    _assignments.removeWhere((a) => a.id == id);
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
        await _ref.read(territoryRepositoryProvider).getTerritories();
    final sessions =
        await _ref.read(preachingSessionRepositoryProvider).getPreachingSessions();
    if (territories.isEmpty || sessions.isEmpty) return;
    if ((await getAssignmentsForWeek(weekStart)).isNotEmpty) return;

    var territoryIndex = 0;
    for (var i = 0; i < sessions.length; i++) {
      final session = sessions[i];
      final date = weekStart.add(Duration(days: _dayOffset(session.dayOfWeek)));
      final conductorId = session.conductorIds.isNotEmpty
          ? session.conductorIds.first
          : null;
      final territory = territories[territoryIndex % territories.length];
      await saveAssignment(AssignmentModel(
        id: 'a${DateTime.now().millisecondsSinceEpoch}_$i',
        date: date,
        conductorId: conductorId,
        meetingLocationId: session.meetingLocationId,
        territoryIds: [territory.id],
        preachingSessionId: session.id,
      ));
      territoryIndex++;
    }
  }
}
