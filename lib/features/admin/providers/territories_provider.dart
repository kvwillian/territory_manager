import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/invalidation_callbacks.dart';
import '../../admin/data/mock_territory_repository.dart';
import '../../territories/models/territory_model.dart';

final territoriesProvider =
    FutureProvider<List<TerritoryModel>>((ref) async {
  final repo = ref.watch(territoryRepositoryProvider);
  return repo.getTerritories();
});

/// Sets up invalidation callback. Watch this in AppShell to register.
final territoriesInvalidateSetupProvider = Provider<void>((ref) {
  invalidateTerritories = () => ref.invalidate(territoriesProvider);
});
