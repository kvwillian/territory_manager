import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../admin/providers/territories_provider.dart';
import '../../assignments/models/assignment_model.dart';
import '../../assignments/models/group_model.dart';
import '../../meetings/models/meeting_location_model.dart';

/// Mock data for development when Firebase is not configured.
/// Provides meeting locations and groups. Empty by default.
final mockMeetingLocationsProvider = Provider<List<MeetingLocationModel>>((ref) {
  return [];
});

final mockGroupsProvider = Provider<List<GroupModel>>((ref) {
  return [];
});

final mockTodayAssignmentProvider = Provider<AssignmentModel?>((ref) {
  final asyncTerritories = ref.watch(territoriesProvider);
    final territories =
        asyncTerritories.hasValue ? asyncTerritories.value! : [];
  if (territories.isEmpty) return null;
  return AssignmentModel(
    id: 'a1',
    date: DateTime.now(),
    groupId: 'g1',
    territoryId: territories.first.id,
  );
});
