import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/local_repository.dart';
import '../../../core/providers/invalidation_callbacks.dart';
import '../../../core/services/offline_sync_service.dart';
import '../../../core/services/connectivity_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/meeting_location_model.dart';
import '../repositories/firestore_meeting_location_repository.dart';
import '../repositories/meeting_location_repository.dart';
import '../repositories/offline_meeting_location_repository.dart';

final meetingLocationsProvider =
    FutureProvider.autoDispose<List<MeetingLocationModel>>((ref) async {
  final repo = ref.watch(meetingLocationRepositoryProvider);
  return repo.getMeetingLocations();
});

final meetingLocationsInvalidateSetupProvider = Provider<void>((ref) {
  invalidateMeetingLocations = () => ref.invalidate(meetingLocationsProvider);
});

final meetingLocationRepositoryProvider =
    Provider<MeetingLocationRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore && !kIsWeb) {
    final db = ref.watch(appDatabaseProvider);
    if (db != null) {
      return OfflineMeetingLocationRepository(
        remote: FirestoreMeetingLocationRepository(
          ref.watch(currentCongregationProvider),
        ),
        local: LocalRepository(db),
        connectivity: ConnectivityService(),
        onInvalidate: () => invalidateMeetingLocations?.call(),
        onReadFromCache: () => ref.read(offlineSyncServiceProvider).refreshFromFirestore().then((didRefresh) {
          if (didRefresh) invalidateMeetingLocations?.call();
        }),
        congregationId: ref.watch(currentCongregationProvider),
      );
    }
  }
  if (useFirestore) {
    return FirestoreMeetingLocationRepository(
      ref.watch(currentCongregationProvider),
    );
  }
  return MockMeetingLocationRepository();
});

class MockMeetingLocationRepository implements MeetingLocationRepository {
  final List<MeetingLocationModel> _locations = [];

  @override
  Future<List<MeetingLocationModel>> getMeetingLocations() async =>
      List.from(_locations);

  @override
  Future<MeetingLocationModel?> getMeetingLocationById(String id) async {
    final index = _locations.indexWhere((l) => l.id == id);
    return index >= 0 ? _locations[index] : null;
  }

  @override
  Future<MeetingLocationModel> createMeetingLocation(
    MeetingLocationModel meetingLocation,
  ) async {
    final id = 'ml${DateTime.now().millisecondsSinceEpoch}';
    final created = meetingLocation.copyWith(id: id);
    _locations.add(created);
    return created;
  }

  @override
  Future<MeetingLocationModel> updateMeetingLocation(
    MeetingLocationModel meetingLocation,
  ) async {
    final index = _locations.indexWhere((l) => l.id == meetingLocation.id);
    if (index >= 0) {
      _locations[index] = meetingLocation;
      return meetingLocation;
    }
    throw StateError('Meeting location not found');
  }

  @override
  Future<void> deleteMeetingLocation(String id) async {
    _locations.removeWhere((l) => l.id == id);
  }
}
