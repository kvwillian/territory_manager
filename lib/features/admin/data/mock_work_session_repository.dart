import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../../assignments/models/work_session_model.dart';
import '../../assignments/repositories/firestore_work_session_repository.dart';
import '../../assignments/repositories/work_session_repository.dart';

final _workSessions = <WorkSessionModel>[];

final workSessionRepositoryProvider = Provider<WorkSessionRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore) {
    return FirestoreWorkSessionRepository(ref.watch(currentCongregationProvider));
  }
  return MockWorkSessionRepository();
});

class MockWorkSessionRepository implements WorkSessionRepository {
  final List<WorkSessionModel> _sessions = List.from(_workSessions);

  @override
  Future<List<WorkSessionModel>> getWorkSessions() async =>
      List.from(_sessions)..sort((a, b) => b.date.compareTo(a.date));

  @override
  Future<List<WorkSessionModel>> getWorkSessionsByTerritory(String territoryId) async =>
      _sessions.where((s) => s.territoryId == territoryId).toList()
        ..sort((a, b) => b.date.compareTo(a.date));

  @override
  Future<List<WorkSessionModel>> getRecentWorkSessions({int limit = 50}) async {
    final sorted = List<WorkSessionModel>.from(_sessions)
      ..sort((a, b) => b.date.compareTo(a.date));
    return sorted.take(limit).toList();
  }

  @override
  Future<WorkSessionModel> createWorkSession(WorkSessionModel session) async {
    final id = 'ws${DateTime.now().millisecondsSinceEpoch}';
    final created = session.copyWith(id: id);
    _sessions.insert(0, created);
    return created;
  }
}
