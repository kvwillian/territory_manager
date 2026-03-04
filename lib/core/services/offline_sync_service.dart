import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/congregation_constants.dart';
import '../database/app_database.dart';
import '../database/local_repository.dart';
import '../../features/admin/data/mock_segment_repository.dart';
import '../../features/admin/data/mock_territory_repository.dart';
import '../../features/admin/data/mock_work_session_repository.dart';
import '../../features/assignments/models/work_session_model.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/providers/current_congregation_provider.dart';
import '../../features/meetings/models/meeting_location_model.dart';
import '../../features/meetings/models/preaching_session_model.dart';
import '../../features/meetings/providers/meeting_location_repository_provider.dart';
import '../../features/meetings/providers/preaching_session_repository_provider.dart';
import '../../features/territories/models/segment_model.dart';
import '../../features/territories/models/segment_status.dart';
import '../../features/territories/models/territory_model.dart';
import 'connectivity_service.dart';

/// Sync operation types for the queue.
const String kSyncUpdateSegmentStatuses = 'syncSegmentStatuses';
const String kSyncCreateWorkSession = 'createWorkSession';

final offlineSyncServiceProvider = Provider<OfflineSyncService>((ref) {
  return OfflineSyncService(ref);
});

/// Service for syncing data between Firestore and local database.
/// Handles initial download, background refresh, and pending write queue.
class OfflineSyncService {
  OfflineSyncService(this._ref);

  final Ref _ref;
  final ConnectivityService _connectivity = ConnectivityService();

  LocalRepository? get _local {
    final db = _ref.read(appDatabaseProvider);
    return db != null ? LocalRepository(db) : null;
  }
  String? get _congregationId =>
      _ref.read(currentCongregationProvider) ?? defaultCongregationId;

  /// Performs initial sync from Firestore to local database.
  /// Call on first login or when local cache is empty.
  Future<void> performInitialSync() async {
    if (kIsWeb || _local == null) return;
    final authState = _ref.read(authStateProvider);
    if (authState is! AuthAuthenticated ||
        authState.user.id == 'demo-user' ||
        authState.user.id == 'demo-admin') {
      return;
    }

    try {
      final territoryRepo = _ref.read(territoryRepositoryProvider);
      final meetingRepo = _ref.read(meetingLocationRepositoryProvider);
      final preachingRepo = _ref.read(preachingSessionRepositoryProvider);

      final territories = await territoryRepo.getTerritories();
      final meetingLocations = await meetingRepo.getMeetingLocations();
      final preachingSessions = await preachingRepo.getPreachingSessions();

      final territoryMaps = territories.map(_territoryToMap).toList();
      final segmentMaps = <Map<String, dynamic>>[];
      for (final t in territories) {
        for (final s in t.segments) {
          segmentMaps.add(_segmentToMap(s));
        }
      }
      final meetingMaps =
          meetingLocations.map((m) => _meetingLocationToMap(m)).toList();
      final preachingMaps =
          preachingSessions.map((p) => _preachingSessionToMap(p)).toList();

      await _local!.upsertTerritories(territoryMaps);
      await _local!.upsertSegments(segmentMaps);
      await _local!.upsertMeetingLocations(meetingMaps);
      await _local!.upsertPreachingSessions(preachingMaps);
    } catch (e) {
      debugPrint('OfflineSyncService.performInitialSync error: $e');
    }
  }

  /// Refreshes local cache from Firestore in background.
  Future<void> refreshFromFirestore() async {
    if (kIsWeb || _local == null) return;
    final online = await _connectivity.isOnline;
    if (!online) return;

    try {
      await performInitialSync();
    } catch (e) {
      debugPrint('OfflineSyncService.refreshFromFirestore error: $e');
    }
  }

  /// Processes pending sync queue when device reconnects.
  Future<void> processSyncQueue() async {
    if (kIsWeb || _local == null) return;
    final online = await _connectivity.isOnline;
    if (!online) return;

    final items = await _local!.getPendingSyncItems();
    final segmentRepo = _ref.read(segmentRepositoryProvider);
    final workSessionRepo = _ref.read(workSessionRepositoryProvider);

    for (final item in items) {
      try {
        if (item.operationType == kSyncUpdateSegmentStatuses) {
          final territoryId = item.payload['territoryId'] as String;
          final statusMap = (item.payload['statusBySegmentId'] as Map)
              .map((k, v) => MapEntry(k as String, SegmentStatus.values.firstWhere(
                    (e) => e.name == v,
                    orElse: () => SegmentStatus.pending,
                  )));
          await segmentRepo.syncSegmentStatuses(territoryId, statusMap);
        } else if (item.operationType == kSyncCreateWorkSession) {
          final ws = WorkSessionModel.fromMap(
            item.payload,
          );
          await workSessionRepo.createWorkSession(ws);
        }
        await _local!.removeSyncItem(item.id);
      } catch (e) {
        debugPrint('OfflineSyncService.processSyncQueue error: $e');
      }
    }
  }

  /// Queues a segment status sync for later.
  Future<void> queueSyncSegmentStatuses(
    String territoryId,
    Map<String, SegmentStatus> statusBySegmentId,
  ) async {
    if (kIsWeb || _local == null) return;
    final payload = {
      'territoryId': territoryId,
      'statusBySegmentId':
          statusBySegmentId.map((k, v) => MapEntry(k, v.name)),
    };
    await _local!.enqueueSyncItem(
      operationType: kSyncUpdateSegmentStatuses,
      payload: payload,
    );
  }

  /// Queues a work session creation for later.
  Future<void> queueCreateWorkSession(WorkSessionModel session) async {
    if (kIsWeb || _local == null) return;
    final payload = session.toMap();
    payload['id'] = ''; // Will be assigned by Firestore
    await _local!.enqueueSyncItem(
      operationType: kSyncCreateWorkSession,
      payload: payload,
    );
  }

  Map<String, dynamic> _territoryToMap(TerritoryModel t) {
    final m = t.toMap();
    m['segments'] = t.segments.map((s) => _segmentToMap(s)).toList();
    m['congregationId'] = t.congregationId ?? _congregationId;
    return m;
  }

  Map<String, dynamic> _segmentToMap(SegmentModel s) {
    final m = s.toMap();
    m['congregationId'] = s.congregationId ?? _congregationId;
    return m;
  }

  Map<String, dynamic> _meetingLocationToMap(MeetingLocationModel m) {
    final map = m.toMap();
    map['congregationId'] = m.congregationId ?? _congregationId;
    return map;
  }

  Map<String, dynamic> _preachingSessionToMap(PreachingSessionModel p) {
    final map = p.toMap();
    map['congregationId'] = p.congregationId ?? _congregationId;
    return map;
  }
}

final appDatabaseProvider = Provider<AppDatabase?>((ref) {
  if (kIsWeb) return null;
  return AppDatabase();
});
