import '../models/work_session_model.dart';

/// Repository for work session history.
abstract class WorkSessionRepository {
  Future<List<WorkSessionModel>> getWorkSessions();
  Future<List<WorkSessionModel>> getWorkSessionsByTerritory(String territoryId);
  Future<List<WorkSessionModel>> getRecentWorkSessions({int limit = 50});
  Future<WorkSessionModel> createWorkSession(WorkSessionModel session);
}
