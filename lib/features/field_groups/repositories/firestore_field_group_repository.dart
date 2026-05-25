import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/field_group_model.dart';
import 'field_group_repository.dart';

const _collection = 'fieldGroups';

class FirestoreFieldGroupRepository implements FieldGroupRepository {
  FirestoreFieldGroupRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _cid => congregationId ?? defaultCongregationId;

  @override
  Future<List<FieldGroupModel>> getFieldGroups() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _cid)
        .get();
    final list = snapshot.docs.map(_docToModel).toList();
    list.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return list;
  }

  @override
  Future<FieldGroupModel?> getFieldGroupById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (!doc.exists || doc.data() == null) return null;
    final g = _docToModel(doc);
    if ((g.congregationId ?? defaultCongregationId) != _cid) return null;
    return g;
  }

  @override
  Future<FieldGroupModel> createFieldGroup(FieldGroupModel group) async {
    final docRef = _firestore.collection(_collection).doc();
    final id = docRef.id;
    final now = DateTime.now();
    await docRef.set({
      'name': group.name,
      'congregationId': _cid,
      'createdAt': Timestamp.fromDate(now),
    });
    return group.copyWith(
      id: id,
      congregationId: _cid,
      createdAt: now,
    );
  }

  @override
  Future<void> updateFieldGroup(FieldGroupModel group) async {
    await _firestore.collection(_collection).doc(group.id).update({
      'name': group.name,
    });
  }

  @override
  Future<void> deleteFieldGroup(String id) async {
    await _firestore.collection(_collection).doc(id).delete();
  }

  FieldGroupModel _docToModel(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    final created = data['createdAt'];
    return FieldGroupModel(
      id: doc.id,
      name: data['name'] as String,
      congregationId: data['congregationId'] as String? ?? defaultCongregationId,
      createdAt: created is Timestamp ? created.toDate() : null,
    );
  }
}
