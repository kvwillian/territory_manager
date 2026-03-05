import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/providers/invalidation_callbacks.dart';
import '../../assignments/models/assignment_model.dart';
import '../../assignments/providers/assignment_repository_provider.dart';
import '../../auth/providers/auth_provider.dart';

final assignmentsProvider = FutureProvider<List<AssignmentModel>>((ref) async {
  final repo = ref.watch(assignmentRepositoryProvider);
  return repo.getAssignments();
});

/// Sets up invalidation callback. Watch this in AppShell to register.
final assignmentsInvalidateSetupProvider = Provider<void>((ref) {
  invalidateAssignments = () {
    ref.invalidate(assignmentsProvider);
    ref.invalidate(assignmentsForWeekProvider);
  };
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

DateTime _getWeekStart(DateTime date) {
  final weekday = date.weekday;
  return DateTime(date.year, date.month, date.day - (weekday - 1));
}
