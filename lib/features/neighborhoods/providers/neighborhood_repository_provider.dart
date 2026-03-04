import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/neighborhood_model.dart';
import '../repositories/firestore_neighborhood_repository.dart';
import '../repositories/neighborhood_repository.dart';

final neighborhoodRepositoryProvider =
    Provider<NeighborhoodRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore) {
    return FirestoreNeighborhoodRepository(
      ref.watch(currentCongregationProvider),
    );
  }
  return MockNeighborhoodRepository();
});

class MockNeighborhoodRepository implements NeighborhoodRepository {
  final List<NeighborhoodModel> _neighborhoods = [];

  @override
  Future<List<NeighborhoodModel>> getNeighborhoods() async =>
      List.from(_neighborhoods);

  @override
  Future<NeighborhoodModel?> getNeighborhoodById(String id) async {
    final index = _neighborhoods.indexWhere((n) => n.id == id);
    return index >= 0 ? _neighborhoods[index] : null;
  }

  @override
  Future<NeighborhoodModel> createNeighborhood(
    NeighborhoodModel neighborhood,
  ) async {
    final id = 'n${DateTime.now().millisecondsSinceEpoch}';
    final created = neighborhood.copyWith(id: id);
    _neighborhoods.add(created);
    return created;
  }

  @override
  Future<NeighborhoodModel> updateNeighborhood(
    NeighborhoodModel neighborhood,
  ) async {
    final index = _neighborhoods.indexWhere((n) => n.id == neighborhood.id);
    if (index >= 0) {
      _neighborhoods[index] = neighborhood;
      return neighborhood;
    }
    throw StateError('Neighborhood not found');
  }

  @override
  Future<void> deleteNeighborhood(String id) async {
    _neighborhoods.removeWhere((n) => n.id == id);
  }
}
