import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/neighborhood_model.dart';
import 'neighborhood_repository.dart';

const _collection = 'neighborhoods';

/// Firestore implementation of NeighborhoodRepository.
class FirestoreNeighborhoodRepository implements NeighborhoodRepository {
  FirestoreNeighborhoodRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _effectiveCongregationId =>
      congregationId ?? defaultCongregationId;

  @override
  Future<List<NeighborhoodModel>> getNeighborhoods() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .orderBy('name')
        .get();
    return snapshot.docs.map(_docToNeighborhood).toList();
  }

  @override
  Future<NeighborhoodModel?> getNeighborhoodById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (!doc.exists || doc.data() == null) return null;
    final n = _docToNeighborhood(doc);
    final docCid = n.congregationId ?? defaultCongregationId;
    if (docCid != _effectiveCongregationId) return null;
    return n;
  }

  @override
  Future<NeighborhoodModel> createNeighborhood(
    NeighborhoodModel neighborhood,
  ) async {
    final docRef = _firestore.collection(_collection).doc();
    final id = docRef.id;

    final data = _neighborhoodToMap(neighborhood);
    data['congregationId'] = _effectiveCongregationId;
    await docRef.set(data);

    return neighborhood.copyWith(
      id: id,
      congregationId: _effectiveCongregationId,
    );
  }

  @override
  Future<NeighborhoodModel> updateNeighborhood(
    NeighborhoodModel neighborhood,
  ) async {
    final docRef = _firestore.collection(_collection).doc(neighborhood.id);
    final doc = await docRef.get();
    if (!doc.exists) throw StateError('Neighborhood not found');

    await docRef.update(_neighborhoodToMap(neighborhood));
    return neighborhood;
  }

  @override
  Future<void> deleteNeighborhood(String id) async {
    await _firestore.collection(_collection).doc(id).delete();
  }

  NeighborhoodModel _docToNeighborhood(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data()!;
    return NeighborhoodModel(
      id: doc.id,
      name: data['name'] as String,
      congregationId: data['congregationId'] as String? ?? defaultCongregationId,
    );
  }

  Map<String, dynamic> _neighborhoodToMap(NeighborhoodModel n) {
    return {
      'name': n.name,
      'congregationId': n.congregationId ?? _effectiveCongregationId,
    };
  }
}
