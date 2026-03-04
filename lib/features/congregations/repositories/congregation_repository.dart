import '../models/congregation_model.dart';

/// Repository for congregation data.
abstract class CongregationRepository {
  Future<CongregationModel?> getCongregationById(String id);
  Future<CongregationModel> createCongregation(CongregationModel congregation);
}
