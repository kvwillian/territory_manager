import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/local_repository.dart';
import '../../../core/services/connectivity_service.dart';
import '../../../core/services/offline_sync_service.dart';
import '../../admin/data/mock_segment_repository.dart';
import '../../admin/data/mock_work_session_repository.dart';
import '../../admin/providers/territories_provider.dart';
import '../../assignments/models/work_session_model.dart';
import '../../territories/models/segment_status.dart';

/// Service for saving territory progress (segment status + work session).
/// When online: syncs to Firestore. When offline: saves to local + queues for later.
final territoryProgressServiceProvider = Provider<TerritoryProgressService>((ref) {
  return TerritoryProgressService(ref);
});

class TerritoryProgressService {
  TerritoryProgressService(this._ref);

  final Ref _ref;
  final ConnectivityService _connectivity = ConnectivityService();

  /// Saves progress: syncs segment statuses and creates work session.
  /// When offline: updates local cache and queues for sync when reconnected.
  Future<void> saveProgress({
    required String territoryId,
    required String conductorId,
    required Map<String, SegmentStatus> statusBySegmentId,
    String? notes,
  }) async {
    final segmentRepo = _ref.read(segmentRepositoryProvider);
    final workSessionRepo = _ref.read(workSessionRepositoryProvider);
    final syncService = _ref.read(offlineSyncServiceProvider);

    final segmentsWorked = statusBySegmentId.entries
        .where((e) => e.value == SegmentStatus.completed)
        .map((e) => e.key)
        .toList();

    final workSession = WorkSessionModel(
      id: '',
      territoryId: territoryId,
      conductorId: conductorId,
      date: DateTime.now(),
      segmentsWorked: segmentsWorked,
      notes: notes,
    );

    if (kIsWeb) {
      await segmentRepo.syncSegmentStatuses(territoryId, statusBySegmentId);
      await workSessionRepo.createWorkSession(workSession);
      return;
    }

    final db = _ref.read(appDatabaseProvider);
    final online = await _connectivity.isOnline;

    if (online && db != null) {
      await segmentRepo.syncSegmentStatuses(territoryId, statusBySegmentId);
      await workSessionRepo.createWorkSession(workSession);
      _ref.invalidate(territoriesProvider);
      return;
    }

    if (db != null) {
      final local = LocalRepository(db);
      final statusMap =
          statusBySegmentId.map((k, v) => MapEntry(k, v.name));
      await local.updateSegmentStatuses(territoryId, statusMap);
      await syncService.queueSyncSegmentStatuses(territoryId, statusBySegmentId);
      await syncService.queueCreateWorkSession(workSession);
      _ref.invalidate(territoriesProvider);
    }
  }
}
