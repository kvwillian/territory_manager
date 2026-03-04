import '../models/territory_model.dart';

/// Repository for territory data.
abstract class TerritoryRepository {
  Future<List<TerritoryModel>> getTerritories();
  Future<TerritoryModel?> getTerritoryById(String id);
  Future<TerritoryModel> createTerritory(TerritoryModel territory);
  Future<TerritoryModel> updateTerritory(TerritoryModel territory);
  Future<void> deleteTerritory(String id);
}
