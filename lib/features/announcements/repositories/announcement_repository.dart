import '../models/announcement_model.dart';

abstract class AnnouncementRepository {
  Future<List<AnnouncementModel>> getAnnouncements();
  Future<AnnouncementModel> createAnnouncement(AnnouncementModel announcement);
  Future<void> deleteAnnouncement(String id);
}
