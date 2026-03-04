import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/preaching_session_model.dart';
import 'preaching_session_repository.dart';

const _collection = 'preachingSessions';

/// Firestore implementation of PreachingSessionRepository.
class FirestorePreachingSessionRepository
    implements PreachingSessionRepository {
  FirestorePreachingSessionRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _effectiveCongregationId =>
      congregationId ?? defaultCongregationId;

  @override
  Future<List<PreachingSessionModel>> getPreachingSessions() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .get();
    return snapshot.docs.map(_docToSession).toList();
  }

  @override
  Future<List<PreachingSessionModel>> getPreachingSessionsByMeetingLocation(
    String meetingLocationId,
  ) async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('meetingLocationId', isEqualTo: meetingLocationId)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .get();
    return snapshot.docs.map(_docToSession).toList();
  }

  @override
  Future<PreachingSessionModel?> getPreachingSessionById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (!doc.exists || doc.data() == null) return null;
    final session = _docToSession(doc);
    final docCid = session.congregationId ?? defaultCongregationId;
    if (docCid != _effectiveCongregationId) return null;
    return session;
  }

  @override
  Future<PreachingSessionModel> createPreachingSession(
    PreachingSessionModel session,
  ) async {
    final docRef = _firestore.collection(_collection).doc();
    final id = docRef.id;

    final data = _sessionToMap(session);
    data['congregationId'] = _effectiveCongregationId;
    data['createdAt'] = FieldValue.serverTimestamp();
    await docRef.set(data);

    return session.copyWith(
      id: id,
      congregationId: _effectiveCongregationId,
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<PreachingSessionModel> updatePreachingSession(
    PreachingSessionModel session,
  ) async {
    final docRef = _firestore.collection(_collection).doc(session.id);
    final doc = await docRef.get();
    if (!doc.exists) throw StateError('Preaching session not found');

    await docRef.update(_sessionToMap(session));

    return session;
  }

  @override
  Future<void> deletePreachingSession(String id) async {
    await _firestore.collection(_collection).doc(id).delete();
  }

  PreachingSessionModel _docToSession(
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

  Map<String, dynamic> _sessionToMap(PreachingSessionModel s) {
    return {
      'dayOfWeek': s.dayOfWeek.name,
      'meetingLocationId': s.meetingLocationId,
      'startTime': s.startTime,
      'conductorIds': s.conductorIds,
      'isSundaySession': s.isSundaySession,
      'congregationId': s.congregationId ?? _effectiveCongregationId,
    };
  }
}
