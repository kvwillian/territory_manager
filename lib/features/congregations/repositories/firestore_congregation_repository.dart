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

  @override
  Future<void> saveMeetingSchedule({
    required String id,
    required int midweekWeekday,
    required String midweekTime,
    required int weekendWeekday,
    required String weekendTime,
  }) async {
    _requireWeekday(midweekWeekday);
    _requireWeekday(weekendWeekday);
    _requireTime(midweekTime);
    _requireTime(weekendTime);
    await _firestore.collection(_collection).doc(id).update({
      'midweekWeekday': midweekWeekday,
      'midweekTime': midweekTime,
      'weekendWeekday': weekendWeekday,
      'weekendTime': weekendTime,
    });
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
      midweekWeekday: congregationWeekday(data['midweekWeekday']),
      midweekTime: data['midweekTime'] as String?,
      weekendWeekday: congregationWeekday(data['weekendWeekday']),
      weekendTime: data['weekendTime'] as String?,
    );
  }
}

void _requireWeekday(int day) {
  if (day < DateTime.monday || day > DateTime.sunday) {
    throw ArgumentError('Dia da semana inválido');
  }
}

void _requireTime(String value) {
  final match = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$').hasMatch(value);
  if (!match) {
    throw ArgumentError('Horário inválido');
  }
}
