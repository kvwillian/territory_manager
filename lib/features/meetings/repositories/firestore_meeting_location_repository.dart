import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/meeting_location_model.dart';
import 'meeting_location_repository.dart';

const _collection = 'meetingLocations';

/// Firestore implementation of MeetingLocationRepository.
class FirestoreMeetingLocationRepository implements MeetingLocationRepository {
  FirestoreMeetingLocationRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _effectiveCongregationId =>
      congregationId ?? defaultCongregationId;

  @override
  Future<List<MeetingLocationModel>> getMeetingLocations() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .get();
    return snapshot.docs.map(_docToMeetingLocation).toList();
  }

  @override
  Future<MeetingLocationModel?> getMeetingLocationById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (!doc.exists || doc.data() == null) return null;
    final loc = _docToMeetingLocation(doc);
    final docCid = loc.congregationId ?? defaultCongregationId;
    if (docCid != _effectiveCongregationId) return null;
    return loc;
  }

  @override
  Future<MeetingLocationModel> createMeetingLocation(
    MeetingLocationModel meetingLocation,
  ) async {
    final docRef = _firestore.collection(_collection).doc();
    final id = docRef.id;

    final data = _meetingLocationToMap(meetingLocation);
    data['congregationId'] = _effectiveCongregationId;
    data['createdAt'] = FieldValue.serverTimestamp();
    await docRef.set(data);

    return meetingLocation.copyWith(
      id: id,
      congregationId: _effectiveCongregationId,
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<MeetingLocationModel> updateMeetingLocation(
    MeetingLocationModel meetingLocation,
  ) async {
    final docRef = _firestore.collection(_collection).doc(meetingLocation.id);
    final doc = await docRef.get();
    if (!doc.exists) throw StateError('Meeting location not found');

    await docRef.update(_meetingLocationToMap(meetingLocation));

    return meetingLocation;
  }

  @override
  Future<void> deleteMeetingLocation(String id) async {
    await _firestore.collection(_collection).doc(id).delete();
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

  Map<String, dynamic> _meetingLocationToMap(MeetingLocationModel m) {
    return {
      'name': m.name,
      'address': m.address,
      'shortLocation': m.shortLocation,
      'houseNumber': m.houseNumber,
      'latitude': m.latitude,
      'longitude': m.longitude,
      'radiusKm': m.radiusKm,
      'allowedTerritories': m.allowedTerritories,
      'congregationId': m.congregationId ?? _effectiveCongregationId,
    };
  }
}
