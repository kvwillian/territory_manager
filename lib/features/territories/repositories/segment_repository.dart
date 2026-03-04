import '../models/segment_model.dart';
import '../models/segment_status.dart';

/// Repository for segment data.
abstract class SegmentRepository {
  Future<List<SegmentModel>> getSegmentsByTerritory(String territoryId);
  Future<void> updateSegmentStatus(String segmentId, SegmentStatus status);
  Future<void> markSegmentsCompleted(List<String> segmentIds);
  Future<void> resetSegmentsForTerritory(String territoryId);
  Future<void> syncSegmentStatuses(
    String territoryId,
    Map<String, SegmentStatus> statusBySegmentId,
  );
  Future<void> createSegments(String territoryId, List<SegmentModel> segments);
  Future<void> updateSegments(String territoryId, List<SegmentModel> segments);
  Future<void> deleteSegmentsByTerritory(String territoryId);
}
