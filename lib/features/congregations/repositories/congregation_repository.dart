import '../models/congregation_model.dart';

/// Repository for congregation data.
abstract class CongregationRepository {
  Future<CongregationModel?> getCongregationById(String id);
  Future<CongregationModel> createCongregation(CongregationModel congregation);
  Future<void> saveMeetingSchedule({
    required String id,
    required int midweekWeekday,
    required String midweekTime,
    required int weekendWeekday,
    required String weekendTime,
  });
}
