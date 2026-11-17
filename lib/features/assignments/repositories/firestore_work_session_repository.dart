import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/work_session_model.dart';
import 'work_session_repository.dart';

const _collection = 'workSessions';

/// Firestore implementation of WorkSessionRepository.
class FirestoreWorkSessionRepository implements WorkSessionRepository {
  FirestoreWorkSessionRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _effectiveCongregationId =>
      congregationId ?? defaultCongregationId;

  @override
  Future<List<WorkSessionModel>> getWorkSessions() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .orderBy('date', descending: true)
        .limit(100)
        .get();
    return snapshot.docs.map(_docToSession).toList();
  }

  @override
  Future<List<WorkSessionModel>> getWorkSessionsByTerritory(
    String territoryId,
  ) async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('territoryId', isEqualTo: territoryId)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .orderBy('date', descending: true)
        .get();
    return snapshot.docs.map(_docToSession).toList();
  }

  @override
  Future<List<WorkSessionModel>> getRecentWorkSessions({int limit = 50}) async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .orderBy('date', descending: true)
        .limit(limit)
        .get();
    return snapshot.docs.map(_docToSession).toList();
  }

  @override
  Future<WorkSessionModel> createWorkSession(WorkSessionModel session) async {
    final docRef = _firestore.collection(_collection).doc();
    final id = docRef.id;
    await docRef.set({
      'territoryId': session.territoryId,
      'conductorId': session.conductorId,
      if (session.conductorName != null) 'conductorName': session.conductorName,
      'date': Timestamp.fromDate(session.date),
      'segmentsWorked': session.segmentsWorked,
      'completionState': session.completionState,
      if (session.raw != null) 'raw': session.raw,
      if (session.importSourceKey != null) 'importSourceKey': session.importSourceKey,
      'notes': session.notes,
      'congregationId':
          session.congregationId ?? _effectiveCongregationId,
    });
    return session.copyWith(id: id, congregationId: _effectiveCongregationId);
  }

  WorkSessionModel _docToSession(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return WorkSessionModel(
      id: doc.id,
      territoryId: data['territoryId'] as String,
      conductorId: data['conductorId'] as String,
      date: (data['date'] as Timestamp).toDate(),
      segmentsWorked:
          (data['segmentsWorked'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      notes: data['notes'] as String?,
      congregationId:
          data['congregationId'] as String? ?? defaultCongregationId,
      conductorName: data['conductorName'] as String?,
      completionState: (data['completionState'] as String?) ?? 'completed',
      raw: data['raw'] as String?,
      importSourceKey: data['importSourceKey'] as String?,
    );
  }
}
