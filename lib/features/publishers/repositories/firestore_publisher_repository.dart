import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

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
    final result = await FirebaseFunctions.instance.httpsCallable('createPublisherAccount').call({
      'name': publisher.name,
      'privilege': publisher.privilege.name,
      'pioneer': publisher.pioneer.name,
      'indicador': publisher.indicador,
      'microfone': publisher.microfone,
      'som': publisher.som,
      if (publisher.phone != null) 'phone': publisher.phone,
      if (publisher.email != null) 'email': publisher.email,
      if (publisher.groupId != null) 'groupId': publisher.groupId,
      if (publisher.userId != null) 'userId': publisher.userId,
      'status': publisher.status,
    });
    final data = Map<String, dynamic>.from(result.data as Map);
    return _fromMap(data['id'] as String? ?? '', data);
  }

  @override
  Future<PublisherModel> updatePublisher(PublisherModel publisher) async {
    final result = await FirebaseFunctions.instance.httpsCallable('updatePublisherAccount').call({
      'publisherId': publisher.id,
      'name': publisher.name,
      'privilege': publisher.privilege.name,
      'pioneer': publisher.pioneer.name,
      'indicador': publisher.indicador,
      'microfone': publisher.microfone,
      'som': publisher.som,
      'phone': publisher.phone,
      'email': publisher.email,
      'status': publisher.status,
    });
    final data = Map<String, dynamic>.from(result.data as Map);
    return _fromMap(publisher.id, data);
  }

  @override
  Future<void> deletePublisher(String id) async {
    await FirebaseFunctions.instance.httpsCallable('deletePublisherAccount').call({'publisherId': id});
  }

  PublisherModel _fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    return _fromMap(doc.id, doc.data() ?? {});
  }

  PublisherModel _fromMap(String id, Map<String, dynamic> data) {
    return PublisherModel(
      id: id,
      name: data['name'] as String? ?? '',
      privilege: privilegeFromName(data['privilege']),
      pioneer: pioneerFromName(data['pioneer']),
      indicador: data['indicador'] == true,
      microfone: data['microfone'] == true,
      som: data['som'] == true,
      congregationId: data['congregationId'] as String? ?? _cid,
      phone: data['phone'] as String?,
      email: data['email'] as String?,
      groupId: data['groupId'] as String?,
      userId: data['userId'] as String?,
      status: data['status'] == 'inactive' ? 'inactive' : 'active',
    );
  }
}
