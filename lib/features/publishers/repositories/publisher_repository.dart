import '../models/publisher_model.dart';

abstract class PublisherRepository {
  Future<List<PublisherModel>> getPublishers();
  Future<PublisherModel?> getPublisherById(String id);
  Future<PublisherModel> createPublisher(PublisherModel publisher);
  Future<PublisherModel> updatePublisher(PublisherModel publisher);
  Future<void> deletePublisher(String id);
}
