import 'package:flutter/foundation.dart';

import '../../../core/constants/congregation_constants.dart';
import '../../../core/database/local_repository.dart';
import '../../../core/services/offline_sync_service.dart';
import '../../../core/services/connectivity_service.dart';
import '../models/preaching_session_model.dart';
import 'preaching_session_repository.dart';

/// Preaching session repository with offline support.
class OfflinePreachingSessionRepository implements PreachingSessionRepository {
  OfflinePreachingSessionRepository({
    required this.remote,
    required this.local,
    required this.syncService,
    required this.connectivity,
    required this.onInvalidate,
    this.congregationId,
  });

  final PreachingSessionRepository remote;
  final LocalRepository local;
  final OfflineSyncService syncService;
  final ConnectivityService connectivity;
  final VoidCallback onInvalidate;
  final String? congregationId;

  String get _cid => congregationId ?? defaultCongregationId;

  @override
  Future<List<PreachingSessionModel>> getPreachingSessions() async {
    if (kIsWeb) return remote.getPreachingSessions();

    final hasCached = await local.hasCachedData();
    if (hasCached) {
      final maps = await local.getPreachingSessions(_cid);
      syncService.refreshFromFirestore().then((_) => onInvalidate());
      return maps.map((m) => PreachingSessionModel.fromMap(m)).toList();
    }

    final list = await remote.getPreachingSessions();
    final maps = list.map((p) {
      final map = p.toMap();
      map['congregationId'] = p.congregationId ?? _cid;
      return map;
    }).toList();
    await local.upsertPreachingSessions(maps);
    return list;
  }

  @override
  Future<List<PreachingSessionModel>> getPreachingSessionsByMeetingLocation(
    String meetingLocationId,
  ) async {
    if (kIsWeb) {
      return remote.getPreachingSessionsByMeetingLocation(meetingLocationId);
    }

    final hasCached = await local.hasCachedData();
    if (hasCached) {
      final maps = await local.getPreachingSessionsByMeetingLocation(meetingLocationId);
      return maps.map((m) => PreachingSessionModel.fromMap(m)).toList();
    }

    return remote.getPreachingSessionsByMeetingLocation(meetingLocationId);
  }

  @override
  Future<PreachingSessionModel?> getPreachingSessionById(String id) async {
    return remote.getPreachingSessionById(id);
  }

  @override
  Future<PreachingSessionModel> createPreachingSession(
    PreachingSessionModel session,
  ) async {
    final result = await remote.createPreachingSession(session);
    if (!kIsWeb) {
      final map = result.toMap();
      map['congregationId'] = result.congregationId ?? _cid;
      await local.upsertPreachingSessions([map]);
      onInvalidate();
    }
    return result;
  }

  @override
  Future<PreachingSessionModel> updatePreachingSession(
    PreachingSessionModel session,
  ) async {
    final result = await remote.updatePreachingSession(session);
    if (!kIsWeb) {
      final map = result.toMap();
      map['congregationId'] = result.congregationId ?? _cid;
      await local.upsertPreachingSessions([map]);
      onInvalidate();
    }
    return result;
  }

  @override
  Future<void> deletePreachingSession(String id) async {
    await remote.deletePreachingSession(id);
    if (!kIsWeb) {
      await local.deletePreachingSession(id);
      onInvalidate();
    }
  }
}
