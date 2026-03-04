import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Sync status for offline data.
enum SyncStatus {
  /// All data synced; no pending items.
  synced,

  /// Sync in progress (fetching from Firestore or processing queue).
  syncing,

  /// Has pending items in queue (offline writes waiting to sync).
  pendingOffline,
}

class SyncStatusNotifier extends Notifier<SyncStatus> {
  @override
  SyncStatus build() => SyncStatus.synced;

  void setSyncing() => state = SyncStatus.syncing;
  void setSynced() => state = SyncStatus.synced;
  void setPendingOffline() => state = SyncStatus.pendingOffline;
}

final syncStatusProvider =
    NotifierProvider<SyncStatusNotifier, SyncStatus>(SyncStatusNotifier.new);
