import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/neighborhood_model.dart';
import 'neighborhood_repository_provider.dart';

final neighborhoodsProvider =
    FutureProvider.autoDispose<List<NeighborhoodModel>>((ref) async {
  final repo = ref.watch(neighborhoodRepositoryProvider);
  return repo.getNeighborhoods();
});
