import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../admin/data/mock_work_session_repository.dart';
import '../../assignments/models/work_session_model.dart';

final workSessionsProvider =
    FutureProvider<List<WorkSessionModel>>((ref) async {
  final repo = ref.watch(workSessionRepositoryProvider);
  return repo.getWorkSessions();
});
