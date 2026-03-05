import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../constants/congregation_constants.dart';
import '../../features/assignments/models/assignment_model.dart';
import '../../features/assignments/models/work_session_model.dart';
import '../../features/territories/models/segment_model.dart';
import '../../features/territories/models/segment_status.dart';

/// Writes directly to Firestore for sync queue processing.
/// Used by OfflineSyncService to avoid repository dependencies.
class FirestoreSyncWriter {
  FirestoreSyncWriter(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _cid => congregationId ?? defaultCongregationId;

  /// Syncs segment statuses for a territory. Fetches segments from Firestore
  /// and batch-updates status/lastWorkedDate.
  Future<void> syncSegmentStatuses(
    String territoryId,
    Map<String, SegmentStatus> statusBySegmentId,
  ) async {
    final segments = await _fetchSegmentsByTerritory(territoryId);
    final batch = _firestore.batch();
    final now = DateTime.now();
    for (final seg in segments) {
      final status = statusBySegmentId[seg.id] ?? seg.status;
      final ref = _firestore.collection('segments').doc(seg.id);
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

  Future<List<SegmentModel>> _fetchSegmentsByTerritory(String territoryId) async {
    final snapshot = await _firestore
        .collection('segments')
        .where('territoryId', isEqualTo: territoryId)
        .where('congregationId', isEqualTo: _cid)
        .get();
    return snapshot.docs.map(_docToSegment).toList();
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

  /// Creates a work session in Firestore.
  Future<void> createWorkSession(WorkSessionModel session) async {
    final docRef = _firestore.collection('workSessions').doc();
    await docRef.set({
      'territoryId': session.territoryId,
      'conductorId': session.conductorId,
      'date': Timestamp.fromDate(session.date),
      'segmentsWorked': session.segmentsWorked,
      'notes': session.notes,
      'congregationId': session.congregationId ?? _cid,
    });
  }

  /// Creates an assignment in Firestore.
  Future<void> createAssignment(AssignmentModel assignment) async {
    final now = DateTime.now();
    final payload = {
      'date': Timestamp.fromDate(assignment.date),
      'congregationId': assignment.congregationId ?? _cid,
      'meetingLocationId': assignment.meetingLocationId,
      'conductorId': assignment.conductorId,
      'territoryIds': assignment.territoryIds,
      'preachingSessionId': assignment.preachingSessionId,
      'createdAt': Timestamp.fromDate(now),
      'updatedAt': Timestamp.fromDate(now),
    };
    debugPrint('FirestoreSyncWriter.createAssignment payload: $payload');
    final docRef = _firestore.collection('assignments').doc(assignment.id);
    await docRef.set(payload);
  }

  /// Updates an assignment in Firestore.
  Future<void> updateAssignment(AssignmentModel assignment) async {
    final docRef = _firestore.collection('assignments').doc(assignment.id);
    await docRef.update({
      'date': Timestamp.fromDate(assignment.date),
      'congregationId': assignment.congregationId ?? _cid,
      'meetingLocationId': assignment.meetingLocationId,
      'conductorId': assignment.conductorId,
      'territoryIds': assignment.territoryIds,
      'preachingSessionId': assignment.preachingSessionId,
      'updatedAt': Timestamp.fromDate(DateTime.now()),
    });
  }

  /// Deletes an assignment from Firestore.
  Future<void> deleteAssignment(String id) async {
    await _firestore.collection('assignments').doc(id).delete();
  }
}
