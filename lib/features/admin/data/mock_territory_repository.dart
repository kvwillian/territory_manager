import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/local_repository.dart';
import '../../../core/providers/invalidation_callbacks.dart';
import '../../../core/services/connectivity_service.dart';
import '../../../core/services/offline_sync_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../../territories/models/territory_model.dart';
import '../../territories/repositories/firestore_territory_repository.dart';
import '../../territories/repositories/offline_territory_repository.dart';
import '../../territories/repositories/territory_repository.dart';

final _initialTerritories = <TerritoryModel>[];

final territoryRepositoryProvider = Provider<TerritoryRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore && !kIsWeb) {
    final db = ref.watch(appDatabaseProvider);
    if (db != null) {
      return OfflineTerritoryRepository(
        remote: FirestoreTerritoryRepository(ref.watch(currentCongregationProvider)),
        local: LocalRepository(db),
        connectivity: ConnectivityService(),
        onInvalidate: () => invalidateTerritories?.call(),
        onReadFromCache: () => ref.read(offlineSyncServiceProvider).refreshFromFirestore().then((_) => invalidateTerritories?.call()),
        congregationId: ref.watch(currentCongregationProvider),
      );
    }
  }
  if (useFirestore) {
    return FirestoreTerritoryRepository(ref.watch(currentCongregationProvider));
  }
  return MockTerritoryRepository();
});

class MockTerritoryRepository implements TerritoryRepository {
  final List<TerritoryModel> _territories = List.from(_initialTerritories);

  @override
  Future<List<TerritoryModel>> getTerritories() async => List.from(_territories);

  @override
  Future<TerritoryModel?> getTerritoryById(String id) async {
    final index = _territories.indexWhere((t) => t.id == id);
    return index >= 0 ? _territories[index] : null;
  }

  @override
  Future<TerritoryModel> createTerritory(TerritoryModel territory) async {
    final id = 't${DateTime.now().millisecondsSinceEpoch}';
    final segments = territory.segments.asMap().entries.map((e) {
      return e.value.copyWith(
        id: 's${id}_${e.key}',
        territoryId: id,
      );
    }).toList();
    final created = territory.copyWith(id: id, segments: segments);
    _territories.add(created);
    return created;
  }

  @override
  Future<TerritoryModel> updateTerritory(TerritoryModel territory) async {
    final index = _territories.indexWhere((t) => t.id == territory.id);
    if (index >= 0) {
      _territories[index] = territory;
      return territory;
    }
    throw StateError('Territory not found');
  }

  @override
  Future<void> deleteTerritory(String id) async {
    _territories.removeWhere((t) => t.id == id);
  }
}
