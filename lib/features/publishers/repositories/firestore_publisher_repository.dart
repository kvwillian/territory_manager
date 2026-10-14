import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/publisher_model.dart';
import 'publisher_repository.dart';

const _collection = 'publishers';

class FirestorePublisherRepository implements PublisherRepository {
  FirestorePublisherRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _cid => congregationId ?? defaultCongregationId;

  @override
  Future<List<PublisherModel>> getPublishers() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _cid)
        .get();
    final items = snapshot.docs.map(_fromDoc).toList();
    items.sort(
      (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
    );
    return items;
  }

  @override
  Future<PublisherModel?> getPublisherById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (!doc.exists || doc.data() == null) return null;
    final publisher = _fromDoc(doc);
    if ((publisher.congregationId ?? _cid) != _cid) return null;
    return publisher;
  }

  @override
  Future<PublisherModel> createPublisher(PublisherModel publisher) async {
    final docRef = _firestore.collection(_collection).doc();
    await docRef.set({
      'name': publisher.name,
      'privilege': publisher.privilege.name,
      'pioneer': publisher.pioneer.name,
      'indicador': publisher.indicador,
      'microfone': publisher.microfone,
      'som': publisher.som,
      'congregationId': _cid,
    });
    return publisher.copyWith(id: docRef.id, congregationId: _cid);
  }

  @override
  Future<PublisherModel> updatePublisher(PublisherModel publisher) async {
    await _firestore.collection(_collection).doc(publisher.id).update({
      'name': publisher.name,
      'privilege': publisher.privilege.name,
      'pioneer': publisher.pioneer.name,
      'indicador': publisher.indicador,
      'microfone': publisher.microfone,
      'som': publisher.som,
      'congregationId': _cid,
    });
    return publisher.copyWith(congregationId: _cid);
  }

  @override
  Future<void> deletePublisher(String id) async {
    await _firestore.collection(_collection).doc(id).delete();
  }

  PublisherModel _fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return PublisherModel(
      id: doc.id,
      name: data['name'] as String? ?? '',
      privilege: privilegeFromName(data['privilege']),
      pioneer: pioneerFromName(data['pioneer']),
      indicador: data['indicador'] == true,
      microfone: data['microfone'] == true,
      som: data['som'] == true,
      congregationId: data['congregationId'] as String? ?? _cid,
    );
  }
}
