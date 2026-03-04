import 'package:flutter/foundation.dart';

import '../../../core/constants/congregation_constants.dart';
import '../../../core/database/local_repository.dart';
import '../../../core/services/connectivity_service.dart';
import '../models/meeting_location_model.dart';
import 'meeting_location_repository.dart';

/// Meeting location repository with offline support.
class OfflineMeetingLocationRepository implements MeetingLocationRepository {
  OfflineMeetingLocationRepository({
    required this.remote,
    required this.local,
    required this.connectivity,
    required this.onInvalidate,
    this.onReadFromCache,
    this.congregationId,
  });

  final MeetingLocationRepository remote;
  final LocalRepository local;
  final ConnectivityService connectivity;
  final VoidCallback onInvalidate;
  /// Called when returning cached data; used to trigger background refresh.
  final VoidCallback? onReadFromCache;
  final String? congregationId;

  String get _cid => congregationId ?? defaultCongregationId;

  @override
  Future<List<MeetingLocationModel>> getMeetingLocations() async {
    if (kIsWeb) return remote.getMeetingLocations();

    final hasCached = await local.hasCachedData();
    if (hasCached) {
      final maps = await local.getMeetingLocations(_cid);
      onReadFromCache?.call();
      return maps.map((m) => MeetingLocationModel.fromMap(m)).toList();
    }

    final list = await remote.getMeetingLocations();
    final maps = list.map((m) {
      final map = m.toMap();
      map['congregationId'] = m.congregationId ?? _cid;
      return map;
    }).toList();
    await local.upsertMeetingLocations(maps);
    return list;
  }

  @override
  Future<MeetingLocationModel?> getMeetingLocationById(String id) async {
    if (kIsWeb) return remote.getMeetingLocationById(id);

    final cached = await local.getMeetingLocationById(id);
    if (cached != null) {
      onReadFromCache?.call();
      return MeetingLocationModel.fromMap(cached);
    }

    final m = await remote.getMeetingLocationById(id);
    if (m != null) {
      final map = m.toMap();
      map['congregationId'] = m.congregationId ?? _cid;
      await local.upsertMeetingLocations([map]);
    }
    return m;
  }

  @override
  Future<MeetingLocationModel> createMeetingLocation(
    MeetingLocationModel meetingLocation,
  ) async {
    final result = await remote.createMeetingLocation(meetingLocation);
    if (!kIsWeb) {
      final map = result.toMap();
      map['congregationId'] = result.congregationId ?? _cid;
      await local.upsertMeetingLocations([map]);
      onInvalidate();
    }
    return result;
  }

  @override
  Future<MeetingLocationModel> updateMeetingLocation(
    MeetingLocationModel meetingLocation,
  ) async {
    final result = await remote.updateMeetingLocation(meetingLocation);
    if (!kIsWeb) {
      final map = result.toMap();
      map['congregationId'] = result.congregationId ?? _cid;
      await local.upsertMeetingLocations([map]);
      onInvalidate();
    }
    return result;
  }

  @override
  Future<void> deleteMeetingLocation(String id) async {
    await remote.deleteMeetingLocation(id);
    if (!kIsWeb) {
      await local.deleteMeetingLocation(id);
      onInvalidate();
    }
  }
}
