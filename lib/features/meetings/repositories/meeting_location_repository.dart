import '../models/meeting_location_model.dart';

/// Repository for meeting location data.
abstract class MeetingLocationRepository {
  Future<List<MeetingLocationModel>> getMeetingLocations();
  Future<MeetingLocationModel?> getMeetingLocationById(String id);
  Future<MeetingLocationModel> createMeetingLocation(
    MeetingLocationModel meetingLocation,
  );
  Future<MeetingLocationModel> updateMeetingLocation(
    MeetingLocationModel meetingLocation,
  );
  Future<void> deleteMeetingLocation(String id);
}
