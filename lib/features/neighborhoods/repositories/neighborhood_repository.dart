import '../models/neighborhood_model.dart';

/// Repository for neighborhood (bairro) data.
abstract class NeighborhoodRepository {
  Future<List<NeighborhoodModel>> getNeighborhoods();
  Future<NeighborhoodModel?> getNeighborhoodById(String id);
  Future<NeighborhoodModel> createNeighborhood(NeighborhoodModel neighborhood);
  Future<NeighborhoodModel> updateNeighborhood(NeighborhoodModel neighborhood);
  Future<void> deleteNeighborhood(String id);
}
