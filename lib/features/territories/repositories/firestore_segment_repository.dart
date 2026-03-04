import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/segment_model.dart';
import '../models/segment_status.dart';
import 'segment_repository.dart';

const _collection = 'segments';

/// Firestore implementation of SegmentRepository.
class FirestoreSegmentRepository implements SegmentRepository {
  FirestoreSegmentRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _effectiveCongregationId =>
      congregationId ?? defaultCongregationId;

  @override
  Future<List<SegmentModel>> getSegmentsByTerritory(String territoryId) async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('territoryId', isEqualTo: territoryId)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .get();
    return snapshot.docs.map(_docToSegment).toList();
  }

  @override
  Future<void> updateSegmentStatus(
    String segmentId,
    SegmentStatus status,
  ) async {
    final updates = <String, dynamic>{
      'status': status.name,
    };
    if (status == SegmentStatus.completed) {
      updates['lastWorkedDate'] = FieldValue.serverTimestamp();
    } else {
      updates['lastWorkedDate'] = FieldValue.delete();
    }
    await _firestore.collection(_collection).doc(segmentId).update(updates);
  }

  @override
  Future<void> markSegmentsCompleted(List<String> segmentIds) async {
    final batch = _firestore.batch();
    final now = DateTime.now();
    for (final id in segmentIds) {
      final ref = _firestore.collection(_collection).doc(id);
      batch.update(ref, {
        'status': SegmentStatus.completed.name,
        'lastWorkedDate': Timestamp.fromDate(now),
      });
    }
    await batch.commit();
  }

  @override
  Future<void> syncSegmentStatuses(
    String territoryId,
    Map<String, SegmentStatus> statusBySegmentId,
  ) async {
    final segments = await getSegmentsByTerritory(territoryId);
    final batch = _firestore.batch();
    final now = DateTime.now();
    for (final seg in segments) {
      final status = statusBySegmentId[seg.id] ?? seg.status;
      final ref = _firestore.collection(_collection).doc(seg.id);
      final updates = <String, dynamic>{'status': status.name};
      if (status == SegmentStatus.completed) {
        updates['lastWorkedDate'] = Timestamp.fromDate(now);
      } else {
        updates['lastWorkedDate'] = FieldValue.delete();
      }
      batch.update(ref, updates);
    }
    await batch.commit();
  }

  @override
  Future<void> resetSegmentsForTerritory(String territoryId) async {
    final segments = await getSegmentsByTerritory(territoryId);
    final batch = _firestore.batch();
    for (final seg in segments) {
      final ref = _firestore.collection(_collection).doc(seg.id);
      batch.update(ref, {
        'status': SegmentStatus.pending.name,
        'lastWorkedDate': null,
      });
    }
    await batch.commit();
  }

  @override
  Future<void> createSegments(
    String territoryId,
    List<SegmentModel> segments,
  ) async {
    final batch = _firestore.batch();
    for (final seg in segments) {
      final docId = seg.id.isNotEmpty
          ? seg.id
          : _firestore.collection(_collection).doc().id;
      final docRef = _firestore.collection(_collection).doc(docId);
      final data = <String, dynamic>{
        'territoryId': territoryId,
        'description': seg.description,
        'status': seg.status.name,
        'congregationId': seg.congregationId ?? _effectiveCongregationId,
      };
      if (seg.lastWorkedDate != null) {
        data['lastWorkedDate'] = Timestamp.fromDate(seg.lastWorkedDate!);
      }
      batch.set(docRef, data);
    }
    await batch.commit();
  }

  @override
  Future<void> updateSegments(
    String territoryId,
    List<SegmentModel> segments,
  ) async {
    final existing = await getSegmentsByTerritory(territoryId);
    final existingIds = existing.map((s) => s.id).toSet();
    final batch = _firestore.batch();

    for (final seg in segments) {
      if (existingIds.contains(seg.id)) {
        final data = <String, dynamic>{
          'description': seg.description,
          'status': seg.status.name,
        };
        if (seg.lastWorkedDate != null) {
          data['lastWorkedDate'] = Timestamp.fromDate(seg.lastWorkedDate!);
        } else {
          data['lastWorkedDate'] = FieldValue.delete();
        }
        batch.update(_firestore.collection(_collection).doc(seg.id), data);
      } else {
        final docId = seg.id.isNotEmpty
            ? seg.id
            : _firestore.collection(_collection).doc().id;
        final docRef = _firestore.collection(_collection).doc(docId);
        final data = <String, dynamic>{
          'territoryId': territoryId,
          'description': seg.description,
          'status': seg.status.name,
          'congregationId': seg.congregationId ?? _effectiveCongregationId,
        };
        if (seg.lastWorkedDate != null) {
          data['lastWorkedDate'] = Timestamp.fromDate(seg.lastWorkedDate!);
        }
        batch.set(docRef, data);
      }
    }

    final newSegmentIds = segments.map((s) => s.id).toSet();
    for (final seg in existing) {
      if (!newSegmentIds.contains(seg.id)) {
        batch.delete(_firestore.collection(_collection).doc(seg.id));
      }
    }
    await batch.commit();
  }

  @override
  Future<void> deleteSegmentsByTerritory(String territoryId) async {
    final segments = await getSegmentsByTerritory(territoryId);
    final batch = _firestore.batch();
    for (final seg in segments) {
      batch.delete(_firestore.collection(_collection).doc(seg.id));
    }
    await batch.commit();
  }

  SegmentModel _docToSegment(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return SegmentModel(
      id: doc.id,
      territoryId: data['territoryId'] as String,
      description: data['description'] as String,
      status: SegmentStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => SegmentStatus.pending,
      ),
      lastWorkedDate: (data['lastWorkedDate'] as Timestamp?)?.toDate(),
      congregationId:
          data['congregationId'] as String? ?? defaultCongregationId,
    );
  }
}
