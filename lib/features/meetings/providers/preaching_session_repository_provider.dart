import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/local_repository.dart';
import '../../../core/services/connectivity_service.dart';
import '../../../core/services/offline_sync_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/preaching_session_model.dart';
import '../repositories/firestore_preaching_session_repository.dart';
import '../repositories/offline_preaching_session_repository.dart';
import '../repositories/preaching_session_repository.dart';

final preachingSessionRepositoryProvider =
    Provider<PreachingSessionRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore && !kIsWeb) {
    final db = ref.watch(appDatabaseProvider);
    if (db != null) {
      return OfflinePreachingSessionRepository(
        remote: FirestorePreachingSessionRepository(
          ref.watch(currentCongregationProvider),
        ),
        local: LocalRepository(db),
        syncService: ref.watch(offlineSyncServiceProvider),
        connectivity: ConnectivityService(),
        onInvalidate: () {},
        congregationId: ref.watch(currentCongregationProvider),
      );
    }
  }
  if (useFirestore) {
    return FirestorePreachingSessionRepository(
      ref.watch(currentCongregationProvider),
    );
  }
  return MockPreachingSessionRepository();
});

class MockPreachingSessionRepository implements PreachingSessionRepository {
  final List<PreachingSessionModel> _sessions = [];

  @override
  Future<List<PreachingSessionModel>> getPreachingSessions() async =>
      List.from(_sessions);

  @override
  Future<List<PreachingSessionModel>> getPreachingSessionsByMeetingLocation(
    String meetingLocationId,
  ) async =>
      _sessions
          .where((s) => s.meetingLocationId == meetingLocationId)
          .toList();

  @override
  Future<PreachingSessionModel?> getPreachingSessionById(String id) async {
    final index = _sessions.indexWhere((s) => s.id == id);
    return index >= 0 ? _sessions[index] : null;
  }

  @override
  Future<PreachingSessionModel> createPreachingSession(
    PreachingSessionModel session,
  ) async {
    final id = 'ps${DateTime.now().millisecondsSinceEpoch}';
    final created = session.copyWith(id: id);
    _sessions.add(created);
    return created;
  }

  @override
  Future<PreachingSessionModel> updatePreachingSession(
    PreachingSessionModel session,
  ) async {
    final index = _sessions.indexWhere((s) => s.id == session.id);
    if (index >= 0) {
      _sessions[index] = session;
      return session;
    }
    throw StateError('Preaching session not found');
  }

  @override
  Future<void> deletePreachingSession(String id) async {
    _sessions.removeWhere((s) => s.id == id);
  }
}
