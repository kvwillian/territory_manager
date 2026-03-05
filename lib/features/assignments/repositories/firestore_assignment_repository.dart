import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart' show FirebaseException;
import 'package:flutter/foundation.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/assignment_model.dart';
import 'assignment_repository.dart';

const _collection = 'assignments';

/// Max retries when PERMISSION_DENIED (user doc may still be propagating).
const _maxRetries = 4;

/// Delay between retries (user doc propagation after Cloud Function creates user).
const _retryDelayMs = 600;

/// Firestore implementation of AssignmentRepository.
class FirestoreAssignmentRepository implements AssignmentRepository {
  FirestoreAssignmentRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _cid => congregationId ?? defaultCongregationId;

  @override
  Future<List<AssignmentModel>> getAssignments() async {
    final cid = _cid;
    if (cid.isEmpty) {
      debugPrint(
        'FirestoreAssignmentRepository.getAssignments: WARNING _cid is empty '
        '(congregationId=$congregationId)',
      );
    }
    if (cid == defaultCongregationId) {
      debugPrint(
        'FirestoreAssignmentRepository.getAssignments: _cid=default '
        '(congregationId=$congregationId) - rules must also return default',
      );
    }
    return _getAssignmentsWithRetry(0);
  }

  Future<List<AssignmentModel>> _getAssignmentsWithRetry(int attempt) async {
    final cid = _cid;
    try {
      final snapshot = await _firestore
          .collection(_collection)
          .where('congregationId', isEqualTo: cid)
          .get();
      return snapshot.docs.map(_docToAssignment).toList();
    } catch (e, st) {
      final isPermissionDenied = e.toString().contains('permission-denied') ||
          (e is FirebaseException && e.code == 'permission-denied');
      if (isPermissionDenied && attempt < _maxRetries) {
        debugPrint(
          'FirestoreAssignmentRepository: PERMISSION_DENIED (attempt ${attempt + 1}/$_maxRetries), '
          'retrying in ${_retryDelayMs}ms - user doc may still be propagating',
        );
        await Future<void>.delayed(Duration(milliseconds: _retryDelayMs));
        return _getAssignmentsWithRetry(attempt + 1);
      }
      debugPrint(
        'FirestoreAssignmentRepository.getAssignments error: $e\n$st',
      );
      rethrow;
    }
  }

  @override
  Future<List<AssignmentModel>> getAssignmentsForWeek(DateTime weekStart) async {
    final weekEnd = weekStart.add(const Duration(days: 7));
    final all = await getAssignments();
    return all
        .where((a) =>
            !a.date.isBefore(weekStart) && a.date.isBefore(weekEnd))
        .toList();
  }

  @override
  Future<AssignmentModel?> getAssignmentForDate(DateTime date) async {
    final normalized = DateTime(date.year, date.month, date.day);
    final all = await getAssignments();
    try {
      return all.firstWhere((a) =>
          DateTime(a.date.year, a.date.month, a.date.day) == normalized);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> saveAssignment(AssignmentModel assignment) async {
    final docRef = _firestore.collection(_collection).doc(assignment.id);
    final doc = await docRef.get();
    final now = DateTime.now();
    final data = {
      'date': Timestamp.fromDate(assignment.date),
      'congregationId': assignment.congregationId ?? _cid,
      'meetingLocationId': assignment.meetingLocationId,
      'conductorId': assignment.conductorId,
      'territoryIds': assignment.territoryIds,
      'preachingSessionId': assignment.preachingSessionId,
      'updatedAt': Timestamp.fromDate(now),
    };
    if (doc.exists) {
      await docRef.update(data);
    } else {
      data['createdAt'] = Timestamp.fromDate(now);
      debugPrint(
        'FirestoreAssignmentRepository.saveAssignment (create) payload: $data',
      );
      await docRef.set(data);
    }
  }

  @override
  Future<void> deleteAssignment(String id) async {
    await _firestore.collection(_collection).doc(id).delete();
  }

  @override
  Future<void> generateAssignments(DateTime weekStart) async {
    // Generation delegates to repository that has access to sessions/territories.
    // Firestore repo only does CRUD; generation logic stays in a service or
    // a repository that composes.
    throw UnimplementedError(
      'generateAssignments not implemented for FirestoreAssignmentRepository; '
      'use OfflineAssignmentRepository or a service',
    );
  }

  AssignmentModel _docToAssignment(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    final date = data['date'];
    final dateTime = date is Timestamp
        ? date.toDate()
        : DateTime.tryParse(date as String? ?? '') ?? DateTime.now();
    final territoryIdsRaw = data['territoryIds'];
    final territoryIds = territoryIdsRaw != null
        ? (territoryIdsRaw as List<dynamic>).map((e) => e as String).toList()
        : <String>[];
    return AssignmentModel(
      id: doc.id,
      date: dateTime,
      territoryId: data['territoryId'] as String?,
      conductorId: data['conductorId'] as String?,
      meetingLocationId: data['meetingLocationId'] as String?,
      territoryIds: territoryIds,
      preachingSessionId: data['preachingSessionId'] as String?,
      congregationId: data['congregationId'] as String? ?? defaultCongregationId,
    );
  }
}
