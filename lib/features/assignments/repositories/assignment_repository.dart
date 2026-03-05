import '../models/assignment_model.dart';

/// Repository for assignment data.
/// Assignments use: conductorId, meetingLocationId, territoryIds, preachingSessionId.
abstract class AssignmentRepository {
  Future<List<AssignmentModel>> getAssignments();
  Future<List<AssignmentModel>> getAssignmentsForWeek(DateTime weekStart);
  Future<AssignmentModel?> getAssignmentForDate(DateTime date);
  Future<void> saveAssignment(AssignmentModel assignment);
  Future<void> deleteAssignment(String id);
  Future<void> generateAssignments(DateTime weekStart);
}
