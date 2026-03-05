import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/providers/invalidation_callbacks.dart';
import '../../assignments/models/assignment_model.dart';
import '../../assignments/providers/assignment_repository_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../meetings/providers/preaching_session_repository_provider.dart';

final assignmentsProvider = FutureProvider<List<AssignmentModel>>((ref) async {
  final repo = ref.watch(assignmentRepositoryProvider);
  return repo.getAssignments();
});

/// Sets up invalidation callback. Watch this in AppShell to register.
final assignmentsInvalidateSetupProvider = Provider<void>((ref) {
  invalidateAssignments = () {
    ref.invalidate(assignmentsProvider);
    ref.invalidate(assignmentsForWeekProvider);
    ref.invalidate(nextAssignmentForConductorProvider);
    ref.invalidate(conductorAssignmentForDateProvider);
    ref.invalidate(conductorAssignmentDatesProvider);
  };
});

/// Selected date for conductor calendar. Defaults to next session date or today.
final conductorSelectedDateProvider = StateProvider<DateTime?>((ref) => null);

/// Assignment for a specific date for the current conductor.
final conductorAssignmentForDateProvider =
    FutureProvider.family<AssignmentModel?, DateTime>((ref, date) async {
  final authState = ref.watch(authStateProvider);
  if (authState is! AuthAuthenticated || !authState.user.isConductor) {
    return null;
  }
  final conductorId = authState.user.id;
  final repo = ref.watch(assignmentRepositoryProvider);
  final sessionRepo = ref.watch(preachingSessionRepositoryProvider);
  final all = await repo.getAssignments();

  final target = DateTime(date.year, date.month, date.day);

  for (final a in all) {
    final aDate = DateTime(a.date.year, a.date.month, a.date.day);
    if (aDate != target) continue;

    final matchesByAssignment = a.conductorId == conductorId;
    var matchesBySession = false;
    if (!matchesByAssignment &&
        a.preachingSessionId != null &&
        a.preachingSessionId!.isNotEmpty) {
      final session =
          await sessionRepo.getPreachingSessionById(a.preachingSessionId!);
      matchesBySession =
          session?.conductorIds.contains(conductorId) ?? false;
    }

    if (matchesByAssignment || matchesBySession) {
      return a;
    }
  }
  return null;
});

/// Dates that have sessions for the current conductor (for calendar highlighting).
final conductorAssignmentDatesProvider =
    FutureProvider<Set<DateTime>>((ref) async {
  final authState = ref.watch(authStateProvider);
  if (authState is! AuthAuthenticated || !authState.user.isConductor) {
    return {};
  }
  final conductorId = authState.user.id;
  final repo = ref.watch(assignmentRepositoryProvider);
  final sessionRepo = ref.watch(preachingSessionRepositoryProvider);
  final all = await repo.getAssignments();

  final dates = <DateTime>{};
  for (final a in all) {
    final matchesByAssignment = a.conductorId == conductorId;
    var matchesBySession = false;
    if (!matchesByAssignment &&
        a.preachingSessionId != null &&
        a.preachingSessionId!.isNotEmpty) {
      final session =
          await sessionRepo.getPreachingSessionById(a.preachingSessionId!);
      matchesBySession =
          session?.conductorIds.contains(conductorId) ?? false;
    }

    if (matchesByAssignment || matchesBySession) {
      dates.add(DateTime(a.date.year, a.date.month, a.date.day));
    }
  }
  return dates;
});

/// Selected week start (Monday) for the assignments screen.
final selectedWeekStartProvider =
    StateProvider<DateTime>((ref) => _getWeekStart(DateTime.now()));

/// Assignments for the currently selected week.
final assignmentsForWeekProvider =
    FutureProvider<List<AssignmentModel>>((ref) async {
  final weekStart = ref.watch(selectedWeekStartProvider);
  final repo = ref.watch(assignmentRepositoryProvider);
  return repo.getAssignmentsForWeek(weekStart);
});

/// Today's assignment for the current conductor. Used by conductor home screen.
final todayAssignmentForConductorProvider =
    FutureProvider<AssignmentModel?>((ref) async {
  final authState = ref.watch(authStateProvider);
  if (authState is! AuthAuthenticated || !authState.user.isConductor) {
    return null;
  }
  final conductorId = authState.user.id;
  final repo = ref.watch(assignmentRepositoryProvider);
  final assignment = await repo.getAssignmentForDate(DateTime.now());
  if (assignment == null || assignment.conductorId != conductorId) {
    return null;
  }
  return assignment;
});

/// Next scheduled assignment for the current conductor (today or future).
/// Matches by assignment.conductorId or by preaching session conductorIds.
final nextAssignmentForConductorProvider =
    FutureProvider<AssignmentModel?>((ref) async {
  final authState = ref.watch(authStateProvider);
  if (authState is! AuthAuthenticated || !authState.user.isConductor) {
    return null;
  }
  final conductorId = authState.user.id;
  final repo = ref.watch(assignmentRepositoryProvider);
  final sessionRepo = ref.watch(preachingSessionRepositoryProvider);
  final all = await repo.getAssignments();

  if (kDebugMode) {
    debugPrint(
      'nextAssignmentForConductor: conductorId=$conductorId, '
      'totalAssignments=${all.length}, '
      'sampleConductorIds=${all.take(3).map((a) => a.conductorId).toList()}',
    );
  }

  final today = DateTime.now();
  final todayStart = DateTime(today.year, today.month, today.day);

  final forConductor = <AssignmentModel>[];
  for (final a in all) {
    if (a.date.isBefore(todayStart)) continue;

    final matchesByAssignment = a.conductorId == conductorId;
    var matchesBySession = false;
    if (!matchesByAssignment &&
        a.preachingSessionId != null &&
        a.preachingSessionId!.isNotEmpty) {
      final session =
          await sessionRepo.getPreachingSessionById(a.preachingSessionId!);
      matchesBySession =
          session?.conductorIds.contains(conductorId) ?? false;
    }

    if (matchesByAssignment || matchesBySession) {
      forConductor.add(a);
    }
  }

  forConductor.sort((a, b) => a.date.compareTo(b.date));
  final result = forConductor.isNotEmpty ? forConductor.first : null;

  if (kDebugMode && result != null) {
    debugPrint(
      'nextAssignmentForConductor: found assignment ${result.id} '
      'for ${result.date}, conductorId=${result.conductorId}',
    );
  }

  return result;
});

DateTime _getWeekStart(DateTime date) {
  final weekday = date.weekday;
  return DateTime(date.year, date.month, date.day - (weekday - 1));
}
