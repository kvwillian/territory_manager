import '../models/assignment_model.dart';
import '../models/group_model.dart';
import '../../meetings/models/meeting_location_model.dart';

/// Repository for assignment data.
abstract class AssignmentRepository {
  Future<List<AssignmentModel>> getAssignments();
  Future<List<AssignmentModel>> getAssignmentsForWeek(DateTime weekStart);
  Future<List<GroupModel>> getGroups();
  Future<List<MeetingLocationModel>> getMeetingLocations();
  Future<void> generateAssignments(DateTime weekStart);
}
