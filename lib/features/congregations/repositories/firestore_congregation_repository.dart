import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/congregation_model.dart';
import 'congregation_repository.dart';

const _collection = 'congregations';

/// Firestore implementation of CongregationRepository.
class FirestoreCongregationRepository implements CongregationRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  @override
  Future<CongregationModel?> getCongregationById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (!doc.exists || doc.data() == null) return null;
    return _docToCongregation(doc);
  }

  @override
  Future<CongregationModel> createCongregation(
    CongregationModel congregation,
  ) async {
    final docRef = _firestore.collection(_collection).doc();
    final id = docRef.id;

    await docRef.set({
      'name': congregation.name,
      'city': congregation.city,
      'country': congregation.country,
      'createdAt': FieldValue.serverTimestamp(),
      'createdBy': congregation.createdBy,
    });

    return congregation.copyWith(
      id: id,
      createdAt: DateTime.now(),
    );
  }

  CongregationModel _docToCongregation(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data()!;
    return CongregationModel(
      id: doc.id,
      name: data['name'] as String,
      city: data['city'] as String,
      country: data['country'] as String,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
      createdBy: data['createdBy'] as String?,
    );
  }
}
