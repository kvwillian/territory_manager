import 'package:flutter/foundation.dart';

import '../../../core/constants/congregation_constants.dart';
import '../../../core/database/local_repository.dart';
import '../../../core/services/connectivity_service.dart';
import '../models/territory_model.dart';
import 'territory_repository.dart';

/// Territory repository with offline support.
/// Reads from local first; optionally triggers background refresh via callback.
/// Writes go to local immediately; Firestore when online.
class OfflineTerritoryRepository implements TerritoryRepository {
  OfflineTerritoryRepository({
    required this.remote,
    required this.local,
    required this.connectivity,
    required this.onInvalidate,
    this.onReadFromCache,
    this.congregationId,
  });

  final TerritoryRepository remote;
  final String? congregationId;
  final LocalRepository local;
  final ConnectivityService connectivity;
  final VoidCallback onInvalidate;
  /// Called when returning cached data; used to trigger background refresh.
  final VoidCallback? onReadFromCache;

  @override
  Future<List<TerritoryModel>> getTerritories() async {
    if (kIsWeb) return remote.getTerritories();

    final hasCached = await local.hasCachedData();
    if (hasCached) {
      final cid = congregationId ?? defaultCongregationId;
      final maps = await local.getTerritories(cid);
      // Merge segments from segments table (source of truth for status updates)
      for (final m in maps) {
        final tid = m['id'] as String?;
        if (tid != null) {
          final segs = await local.getSegmentsByTerritory(tid);
          if (segs.isNotEmpty) m['segments'] = segs;
        }
      }
      final result = maps.map((m) => TerritoryModel.fromMap(m)).toList();
      onReadFromCache?.call();
      return result;
    }

    final territories = await remote.getTerritories();
    final maps = territories.map((t) {
      final m = t.toMap();
      m['segments'] = t.segments.map((s) {
        final sm = s.toMap();
        sm['congregationId'] = s.congregationId;
        return sm;
      }).toList();
      m['congregationId'] = t.congregationId;
      return m;
    }).toList();
    await local.upsertTerritories(maps);
    final segmentMaps = <Map<String, dynamic>>[];
    for (final t in territories) {
      for (final s in t.segments) {
        segmentMaps.add(s.toMap()..['congregationId'] = s.congregationId);
      }
    }
    await local.upsertSegments(segmentMaps);
    return territories;
  }

  @override
  Future<TerritoryModel?> getTerritoryById(String id) async {
    if (kIsWeb) return remote.getTerritoryById(id);

    final cached = await local.getTerritoryById(id);
    if (cached != null) {
      final segs = await local.getSegmentsByTerritory(id);
      if (segs.isNotEmpty) cached['segments'] = segs;
      onReadFromCache?.call();
      return TerritoryModel.fromMap(cached);
    }

    final t = await remote.getTerritoryById(id);
    if (t != null) {
      final m = t.toMap();
      m['segments'] = t.segments.map((s) => s.toMap()..['congregationId'] = s.congregationId).toList();
      m['congregationId'] = t.congregationId;
      await local.upsertTerritories([m]);
      for (final s in t.segments) {
        final sm = s.toMap();
        sm['congregationId'] = s.congregationId;
        await local.upsertSegments([sm]);
      }
    }
    return t;
  }

  @override
  Future<TerritoryModel> createTerritory(TerritoryModel territory) async {
    final result = await remote.createTerritory(territory);
    if (!kIsWeb) {
      final m = result.toMap();
      m['segments'] = result.segments.map((s) => s.toMap()..['congregationId'] = s.congregationId).toList();
      m['congregationId'] = result.congregationId;
      await local.upsertTerritories([m]);
      for (final s in result.segments) {
        final sm = s.toMap();
        sm['congregationId'] = s.congregationId;
        await local.upsertSegments([sm]);
      }
    }
    return result;
  }

  @override
  Future<TerritoryModel> updateTerritory(TerritoryModel territory) async {
    final result = await remote.updateTerritory(territory);
    if (!kIsWeb) {
      final m = result.toMap();
      m['segments'] = result.segments.map((s) => s.toMap()..['congregationId'] = s.congregationId).toList();
      m['congregationId'] = result.congregationId;
      await local.upsertTerritories([m]);
      for (final s in result.segments) {
        final sm = s.toMap();
        sm['congregationId'] = s.congregationId;
        await local.upsertSegments([sm]);
      }
      onInvalidate();
    }
    return result;
  }

  @override
  Future<void> deleteTerritory(String id) async {
    await remote.deleteTerritory(id);
    if (!kIsWeb) {
      await local.deleteSegmentsByTerritory(id);
      await local.deleteTerritory(id);
      onInvalidate();
    }
  }
}
