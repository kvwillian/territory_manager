import 'package:cloud_firestore/cloud_firestore.dart';

import '../constants/congregation_constants.dart';
import '../../features/territories/models/segment_status.dart';
import '../../features/meetings/models/meeting_location_model.dart';
import '../../features/meetings/models/preaching_session_model.dart';
import '../../features/territories/models/segment_model.dart';
import '../../features/territories/models/territory_model.dart';

/// Fetches data directly from Firestore. Used by OfflineSyncService.
/// Does NOT depend on any repository to avoid circular dependencies.
class FirestoreDataFetcher {
  FirestoreDataFetcher(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _cid => congregationId ?? defaultCongregationId;

  Future<List<TerritoryModel>> fetchTerritoriesWithSegments() async {
    final snapshot = await _firestore
        .collection('territories')
        .where('congregationId', isEqualTo: _cid)
        .get();

    final territories = <TerritoryModel>[];
    for (final doc in snapshot.docs) {
      final t = _docToTerritory(doc);
      final segments = await _fetchSegmentsByTerritory(t.id);
      territories.add(t.copyWith(segments: segments));
    }
    return territories;
  }

  Future<List<SegmentModel>> _fetchSegmentsByTerritory(String territoryId) async {
    final snapshot = await _firestore
        .collection('segments')
        .where('territoryId', isEqualTo: territoryId)
        .where('congregationId', isEqualTo: _cid)
        .get();
    return snapshot.docs.map(_docToSegment).toList();
  }

  Future<List<MeetingLocationModel>> fetchMeetingLocations() async {
    final snapshot = await _firestore
        .collection('meetingLocations')
        .where('congregationId', isEqualTo: _cid)
        .get();
    return snapshot.docs.map(_docToMeetingLocation).toList();
  }

  Future<List<PreachingSessionModel>> fetchPreachingSessions() async {
    final snapshot = await _firestore
        .collection('preachingSessions')
        .where('congregationId', isEqualTo: _cid)
        .get();
    return snapshot.docs.map(_docToPreachingSession).toList();
  }

  TerritoryModel _docToTerritory(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    final centroidLat = (data['centroidLat'] ?? data['latitude']) != null
        ? ((data['centroidLat'] ?? data['latitude']) as num).toDouble()
        : null;
    final centroidLng = (data['centroidLng'] ?? data['longitude']) != null
        ? ((data['centroidLng'] ?? data['longitude']) as num).toDouble()
        : null;
    return TerritoryModel(
      id: doc.id,
      name: data['name'] as String,
      neighborhood: data['neighborhood'] as String,
      neighborhoodId: data['neighborhoodId'] as String?,
      number: data['number'] as String?,
      address: data['address'] as String?,
      shortAddress: data['shortAddress'] as String?,
      imageUrl: data['imageUrl'] as String?,
      mapsUrl: data['mapsUrl'] as String?,
      centroidLat: centroidLat,
      centroidLng: centroidLng,
      segments: [],
      congregationId: data['congregationId'] as String? ?? defaultCongregationId,
    );
  }

  SegmentModel _docToSegment(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return SegmentModel(
      id: doc.id,
      territoryId: data['territoryId'] as String,
      description: data['description'] as String,
      status: SegmentStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => SegmentStatus.pending,
      ),
      lastWorkedDate: (data['lastWorkedDate'] as Timestamp?)?.toDate(),
      congregationId:
          data['congregationId'] as String? ?? defaultCongregationId,
    );
  }

  MeetingLocationModel _docToMeetingLocation(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data()!;
    final radiusKm = data['radiusKm'] != null
        ? (data['radiusKm'] as num).toDouble()
        : (data['radiusMeters'] as num?)?.toDouble() ?? 2.0;
    return MeetingLocationModel(
      id: doc.id,
      name: data['name'] as String,
      address: data['address'] as String?,
      shortLocation: data['shortLocation'] as String?,
      houseNumber: data['houseNumber'] as String?,
      latitude: (data['latitude'] as num).toDouble(),
      longitude: (data['longitude'] as num).toDouble(),
      radiusKm: radiusKm,
      allowedTerritories:
          (data['allowedTerritories'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      congregationId:
          data['congregationId'] as String? ?? defaultCongregationId,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
    );
  }

  PreachingSessionModel _docToPreachingSession(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data()!;
    return PreachingSessionModel(
      id: doc.id,
      dayOfWeek: DayOfWeek.values.firstWhere(
        (e) => e.name == data['dayOfWeek'],
        orElse: () => DayOfWeek.thursday,
      ),
      meetingLocationId: data['meetingLocationId'] as String,
      startTime: data['startTime'] as String,
      conductorIds:
          (data['conductorIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      isSundaySession: data['isSundaySession'] as bool? ?? false,
      congregationId:
          data['congregationId'] as String? ?? defaultCongregationId,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
    );
  }
}
