import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/congregation_constants.dart';
import '../database/app_database.dart';
import '../database/local_repository.dart';
import '../../features/assignments/models/assignment_model.dart';
import '../../features/assignments/models/work_session_model.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/providers/current_congregation_provider.dart';
import '../../features/meetings/models/meeting_location_model.dart';
import '../../features/meetings/models/preaching_session_model.dart';
import '../providers/invalidation_callbacks.dart';
import 'firestore_data_fetcher.dart';
import 'firestore_sync_writer.dart';
import '../../features/territories/models/segment_model.dart';
import '../../features/territories/models/segment_status.dart';
import '../../features/territories/models/territory_model.dart';
import '../providers/sync_status_provider.dart';
import 'connectivity_service.dart';

/// Sync operation types for the queue.
const String kSyncUpdateSegmentStatuses = 'syncSegmentStatuses';
const String kSyncCreateWorkSession = 'createWorkSession';
const String kSyncCreateAssignment = 'createAssignment';
const String kSyncUpdateAssignment = 'updateAssignment';
const String kSyncDeleteAssignment = 'deleteAssignment';

final offlineSyncServiceProvider = Provider<OfflineSyncService>((ref) {
  return OfflineSyncService(ref);
});

/// Service for syncing data between Firestore and local database.
/// Handles initial download, background refresh, and pending write queue.
class OfflineSyncService {
  OfflineSyncService(this._ref);

  final Ref _ref;
  final ConnectivityService _connectivity = ConnectivityService();

  bool _isSyncing = false;
  bool _initialSyncCompleted = false;
  DateTime? _lastRefreshTime;

  static const Duration _refreshThrottle = Duration(seconds: 30);

  /// Exposed for connectivity listener to avoid concurrent sync.
  bool get isSyncing => _isSyncing;

  LocalRepository? get _local {
    final db = _ref.read(appDatabaseProvider);
    return db != null ? LocalRepository(db) : null;
  }
  String? get _congregationId =>
      _ref.read(currentCongregationProvider) ?? defaultCongregationId;

  /// Performs initial sync from Firestore to local database.
  /// Call on first login only. Runs at most once per session.
  Future<void> performInitialSync() async {
    if (kIsWeb || _local == null) return;
    if (_isSyncing) {
      debugPrint('OfflineSyncService: initial sync skipped (already syncing)');
      return;
    }
    if (_initialSyncCompleted) {
      debugPrint('OfflineSyncService: initial sync skipped (already completed)');
      return;
    }
    final authState = _ref.read(authStateProvider);
    if (authState is! AuthAuthenticated ||
        authState.user.id == 'demo-user' ||
        authState.user.id == 'demo-admin') {
      return;
    }

    _isSyncing = true;
    _ref.read(syncStatusProvider.notifier).setSyncing();
    debugPrint('OfflineSyncService: initial sync started');
    try {
      final fetcher = FirestoreDataFetcher(_congregationId);
      final territories = await fetcher.fetchTerritoriesWithSegments();
      final meetingLocations = await fetcher.fetchMeetingLocations();
      final preachingSessions = await fetcher.fetchPreachingSessions();
      final assignments = await fetcher.fetchAssignments();

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
      final assignmentMaps =
          assignments.map((a) => _assignmentToMap(a)).toList();

      await _local!.upsertTerritories(territoryMaps);
      await _local!.upsertSegments(segmentMaps);
      await _local!.upsertMeetingLocations(meetingMaps);
      await _local!.upsertPreachingSessions(preachingMaps);
      await _local!.upsertAssignments(assignmentMaps);
      invalidateTerritories?.call();
      invalidateMeetingLocations?.call();
      invalidateAssignments?.call();
      await _updateSyncStatus();
      _lastRefreshTime = DateTime.now();
      debugPrint('OfflineSyncService: initial sync finished');
    } catch (e) {
      debugPrint('OfflineSyncService.performInitialSync error: $e');
      await _updateSyncStatus();
    } finally {
      _isSyncing = false;
      _initialSyncCompleted = true;
      if (await _connectivity.isOnline) processSyncQueue();
    }
  }

  Future<void> _updateSyncStatus() async {
    if (_local == null) return;
    final pending = await _local!.getPendingSyncItemsCount();
    final notifier = _ref.read(syncStatusProvider.notifier);
    debugPrint('OfflineSyncService._updateSyncStatus: pending=$pending');
    if (pending > 0) {
      notifier.setPendingOffline();
    } else {
      notifier.setSynced();
    }
  }

  /// Refreshes local cache from Firestore in background.
  /// Does NOT call performInitialSync. Fetches data, updates local DB, invalidates.
  /// Throttled to run at most every 30 seconds.
  Future<void> refreshFromFirestore() async {
    if (kIsWeb || _local == null) return;
    final online = await _connectivity.isOnline;
    if (!online) return;
    if (_isSyncing) return;
    if (_lastRefreshTime != null &&
        DateTime.now().difference(_lastRefreshTime!) < _refreshThrottle) {
      return;
    }

    _isSyncing = true;
    _ref.read(syncStatusProvider.notifier).setSyncing();
    debugPrint('OfflineSyncService: refreshFromFirestore started');
    try {
      final fetcher = FirestoreDataFetcher(_congregationId);
      final territories = await fetcher.fetchTerritoriesWithSegments();
      final meetingLocations = await fetcher.fetchMeetingLocations();
      final preachingSessions = await fetcher.fetchPreachingSessions();
      final assignments = await fetcher.fetchAssignments();

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
      final assignmentMaps =
          assignments.map((a) => _assignmentToMap(a)).toList();

      await _local!.upsertTerritories(territoryMaps);
      await _local!.upsertSegments(segmentMaps);
      await _local!.upsertMeetingLocations(meetingMaps);
      await _local!.upsertPreachingSessions(preachingMaps);
      await _local!.upsertAssignments(assignmentMaps);
      invalidateTerritories?.call();
      invalidateMeetingLocations?.call();
      invalidateAssignments?.call();
      await _updateSyncStatus();
      _lastRefreshTime = DateTime.now();
      debugPrint('OfflineSyncService: refreshFromFirestore finished');
    } catch (e) {
      debugPrint('OfflineSyncService.refreshFromFirestore error: $e');
      await _updateSyncStatus();
    } finally {
      _isSyncing = false;
    }
  }

  /// Processes pending sync queue when device reconnects.
  Future<void> processSyncQueue() async {
    if (kIsWeb || _local == null) return;
    final online = await _connectivity.isOnline;
    if (!online) {
      debugPrint('OfflineSyncService.processSyncQueue: skipped (offline)');
      return;
    }
    if (_isSyncing) {
      debugPrint('OfflineSyncService.processSyncQueue: skipped (already syncing)');
      return;
    }

    _isSyncing = true;
    _ref.read(syncStatusProvider.notifier).setSyncing();
    try {
      final items = await _local!.getPendingSyncItems();
      debugPrint('OfflineSyncService.processSyncQueue: ${items.length} items');
      if (items.isEmpty) {
        await _updateSyncStatus();
        return;
      }
      final writer = FirestoreSyncWriter(_congregationId);

      for (final item in items) {
        try {
          debugPrint(
            'OfflineSyncService.processSyncQueue: processing ${item.operationType}',
          );
          if (item.operationType == kSyncUpdateSegmentStatuses) {
            final territoryId = item.payload['territoryId'] as String;
            final statusMap = (item.payload['statusBySegmentId'] as Map)
                .map((k, v) => MapEntry(k as String, SegmentStatus.values.firstWhere(
                      (e) => e.name == v,
                      orElse: () => SegmentStatus.pending,
                    )));
            await writer.syncSegmentStatuses(territoryId, statusMap);
          } else if (item.operationType == kSyncCreateWorkSession) {
            final ws = WorkSessionModel.fromMap(
              item.payload,
            );
            await writer.createWorkSession(ws);
          } else if (item.operationType == kSyncCreateAssignment) {
            final a = AssignmentModel.fromMap(item.payload);
            await writer.createAssignment(a);
          } else if (item.operationType == kSyncUpdateAssignment) {
            final a = AssignmentModel.fromMap(item.payload);
            await writer.updateAssignment(a);
          } else if (item.operationType == kSyncDeleteAssignment) {
            final id = item.payload['id'] as String;
            await writer.deleteAssignment(id);
          }
          await _local!.removeSyncItem(item.id);
          debugPrint(
            'OfflineSyncService.processSyncQueue: removed item ${item.id}',
          );
        } catch (e, st) {
          debugPrint(
            'OfflineSyncService.processSyncQueue error: $e\n$st',
          );
        }
      }
      invalidateTerritories?.call();
      invalidateMeetingLocations?.call();
      invalidateAssignments?.call();
      await _updateSyncStatus();
    } finally {
      _isSyncing = false;
    }
  }

  /// Queues assignment create for later.
  Future<void> queueCreateAssignment(AssignmentModel assignment) async {
    if (kIsWeb || _local == null) return;
    final payload = assignment.toMap();
    await _local!.enqueueSyncItem(
      operationType: kSyncCreateAssignment,
      payload: payload,
    );
    _ref.read(syncStatusProvider.notifier).setPendingOffline();
    if (await _connectivity.isOnline) processSyncQueue();
  }

  /// Queues assignment update for later.
  Future<void> queueUpdateAssignment(AssignmentModel assignment) async {
    if (kIsWeb || _local == null) return;
    final payload = assignment.toMap();
    await _local!.enqueueSyncItem(
      operationType: kSyncUpdateAssignment,
      payload: payload,
    );
    _ref.read(syncStatusProvider.notifier).setPendingOffline();
    if (await _connectivity.isOnline) processSyncQueue();
  }

  /// Queues assignment delete for later.
  Future<void> queueDeleteAssignment(String id) async {
    if (kIsWeb || _local == null) return;
    await _local!.enqueueSyncItem(
      operationType: kSyncDeleteAssignment,
      payload: {'id': id},
    );
    _ref.read(syncStatusProvider.notifier).setPendingOffline();
    if (await _connectivity.isOnline) processSyncQueue();
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
    _ref.read(syncStatusProvider.notifier).setPendingOffline();
    if (await _connectivity.isOnline) processSyncQueue();
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
    _ref.read(syncStatusProvider.notifier).setPendingOffline();
    if (await _connectivity.isOnline) processSyncQueue();
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

  Map<String, dynamic> _assignmentToMap(AssignmentModel a) {
    final map = a.toMap();
    map['congregationId'] = a.congregationId ?? _congregationId;
    return map;
  }
}

final appDatabaseProvider = Provider<AppDatabase?>((ref) {
  if (kIsWeb) return null;
  return AppDatabase();
});
