import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../admin/data/mock_assignment_repository.dart';
import '../../assignments/models/assignment_model.dart';

final assignmentsProvider = FutureProvider<List<AssignmentModel>>((ref) async {
  final repo = ref.watch(assignmentRepositoryProvider);
  return repo.getAssignments();
});
