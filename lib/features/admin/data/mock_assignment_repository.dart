import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../assignments/models/assignment_model.dart';
import '../../assignments/models/group_model.dart';
import '../../assignments/repositories/assignment_repository.dart';
import '../../meetings/models/meeting_location_model.dart';
import 'mock_territory_repository.dart';

final assignmentRepositoryProvider = Provider<AssignmentRepository>((ref) {
  return MockAssignmentRepository(ref);
});

class MockAssignmentRepository implements AssignmentRepository {
  MockAssignmentRepository(this._ref);

  final Ref _ref;
  final List<AssignmentModel> _assignments = [];

  @override
  Future<List<AssignmentModel>> getAssignments() async => List.from(_assignments);

  @override
  Future<List<AssignmentModel>> getAssignmentsForWeek(DateTime weekStart) async {
    final weekEnd = weekStart.add(const Duration(days: 7));
    return _assignments.where((a) {
      return !a.date.isBefore(weekStart) && a.date.isBefore(weekEnd);
    }).toList();
  }

  @override
  Future<List<GroupModel>> getGroups() async => [];

  @override
  Future<List<MeetingLocationModel>> getMeetingLocations() async => [];

  @override
  Future<void> generateAssignments(DateTime weekStart) async {
    final territories = await _ref.read(territoryRepositoryProvider).getTerritories();
    final groups = await getGroups();
    if (territories.isEmpty || groups.isEmpty) return;

    final existing = await getAssignmentsForWeek(weekStart);
    if (existing.isNotEmpty) return;

    final days = ['Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    var territoryIndex = 0;
    for (var i = 0; i < days.length && i < groups.length; i++) {
      final date = weekStart.add(Duration(days: i));
      final group = groups[i];
      final territory = territories[territoryIndex % territories.length];
      _assignments.add(AssignmentModel(
        id: 'a${DateTime.now().millisecondsSinceEpoch}_$i',
        date: date,
        groupId: group.id,
        territoryId: territory.id,
      ));
      territoryIndex++;
    }
  }
}
