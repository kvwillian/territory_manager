import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/territory_model.dart';
import 'firestore_segment_repository.dart';
import 'territory_repository.dart';

const _collection = 'territories';

/// Firestore implementation of TerritoryRepository.
/// Territories and segments are stored in separate collections.
class FirestoreTerritoryRepository implements TerritoryRepository {
  FirestoreTerritoryRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  late final FirestoreSegmentRepository _segmentRepo =
      FirestoreSegmentRepository(congregationId);

  String get _effectiveCongregationId =>
      congregationId ?? defaultCongregationId;

  @override
  Future<List<TerritoryModel>> getTerritories() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .get();
    final territories = <TerritoryModel>[];
    for (final doc in snapshot.docs) {
      final t = _docToTerritory(doc);
      final segments = await _segmentRepo.getSegmentsByTerritory(t.id);
      territories.add(t.copyWith(segments: segments));
    }
    return territories;
  }

  @override
  Future<TerritoryModel?> getTerritoryById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (!doc.exists || doc.data() == null) return null;
    final t = _docToTerritory(doc);
    final docCid = t.congregationId ?? defaultCongregationId;
    if (docCid != _effectiveCongregationId) return null;
    final segments = await _segmentRepo.getSegmentsByTerritory(id);
    return t.copyWith(segments: segments);
  }

  @override
  Future<TerritoryModel> createTerritory(TerritoryModel territory) async {
    final docRef = _firestore.collection(_collection).doc();
    final id = docRef.id;

    final data = _territoryToMap(territory);
    data['congregationId'] = _effectiveCongregationId;
    await docRef.set(data);

    final segments = territory.segments.asMap().entries.map((e) {
      return e.value.copyWith(
        id: 's${id}_${e.key}',
        territoryId: id,
        congregationId: _effectiveCongregationId,
      );
    }).toList();

    if (segments.isNotEmpty) {
      await _segmentRepo.createSegments(id, segments);
    }

    return territory.copyWith(
      id: id,
      segments: segments,
      congregationId: _effectiveCongregationId,
    );
  }

  @override
  Future<TerritoryModel> updateTerritory(TerritoryModel territory) async {
    final docRef = _firestore.collection(_collection).doc(territory.id);
    final doc = await docRef.get();
    if (!doc.exists) throw StateError('Territory not found');

    final data = _territoryToMap(territory);
    await docRef.update(data);

    await _segmentRepo.updateSegments(territory.id, territory.segments);

    return territory;
  }

  @override
  Future<void> deleteTerritory(String id) async {
    await _segmentRepo.deleteSegmentsByTerritory(id);
    await _firestore.collection(_collection).doc(id).delete();
  }

  TerritoryModel _docToTerritory(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    final id = doc.id;
    final centroidLat = (data['centroidLat'] ?? data['latitude']) != null
        ? ((data['centroidLat'] ?? data['latitude']) as num).toDouble()
        : null;
    final centroidLng = (data['centroidLng'] ?? data['longitude']) != null
        ? ((data['centroidLng'] ?? data['longitude']) as num).toDouble()
        : null;
    return TerritoryModel(
      id: id,
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

  Map<String, dynamic> _territoryToMap(TerritoryModel t) {
    return {
      'name': t.name,
      'neighborhood': t.neighborhood,
      'neighborhoodId': t.neighborhoodId,
      'number': t.number,
      'address': t.address,
      'shortAddress': t.shortAddress,
      'imageUrl': t.imageUrl,
      'mapsUrl': t.mapsUrl,
      'centroidLat': t.centroidLat,
      'centroidLng': t.centroidLng,
      'congregationId': t.congregationId ?? _effectiveCongregationId,
    };
  }
}
