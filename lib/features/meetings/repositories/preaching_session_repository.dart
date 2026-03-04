import '../models/preaching_session_model.dart';

/// Repository for preaching session data.
abstract class PreachingSessionRepository {
  Future<List<PreachingSessionModel>> getPreachingSessions();
  Future<List<PreachingSessionModel>> getPreachingSessionsByMeetingLocation(
    String meetingLocationId,
  );
  Future<PreachingSessionModel?> getPreachingSessionById(String id);
  Future<PreachingSessionModel> createPreachingSession(
    PreachingSessionModel session,
  );
  Future<PreachingSessionModel> updatePreachingSession(
    PreachingSessionModel session,
  );
  Future<void> deletePreachingSession(String id);
}
