import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../../territories/models/segment_model.dart';
import '../../territories/models/segment_status.dart';
import '../../territories/repositories/firestore_segment_repository.dart';
import '../../territories/repositories/segment_repository.dart';
import '../../territories/repositories/territory_repository.dart';
import 'mock_territory_repository.dart';

final segmentRepositoryProvider = Provider<SegmentRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore) {
    return FirestoreSegmentRepository(ref.watch(currentCongregationProvider));
  }
  return MockSegmentRepository(ref);
});

class MockSegmentRepository implements SegmentRepository {
  MockSegmentRepository(this._ref);

  final Ref _ref;

  TerritoryRepository get _territoryRepo =>
      _ref.read(territoryRepositoryProvider) as MockTerritoryRepository;

  @override
  Future<List<SegmentModel>> getSegmentsByTerritory(String territoryId) async {
    final t = await _territoryRepo.getTerritoryById(territoryId);
    return t?.segments ?? [];
  }

  @override
  Future<void> updateSegmentStatus(String segmentId, SegmentStatus status) async {
    final territories = await _territoryRepo.getTerritories();
    for (final t in territories) {
      final idx = t.segments.indexWhere((s) => s.id == segmentId);
      if (idx >= 0) {
        final updated = t.segments.toList();
        updated[idx] = updated[idx].copyWith(
          status: status,
          lastWorkedDate:
              status == SegmentStatus.completed ? DateTime.now() : null,
        );
        await _territoryRepo.updateTerritory(t.copyWith(segments: updated));
        return;
      }
    }
  }

  @override
  Future<void> markSegmentsCompleted(List<String> segmentIds) async {
    final now = DateTime.now();
    final territories = await _territoryRepo.getTerritories();
    for (final t in territories) {
      var changed = false;
      final updated = t.segments.map((s) {
        if (segmentIds.contains(s.id)) {
          changed = true;
          return s.copyWith(
            status: SegmentStatus.completed,
            lastWorkedDate: now,
          );
        }
        return s;
      }).toList();
      if (changed) {
        await _territoryRepo.updateTerritory(t.copyWith(segments: updated));
      }
    }
  }

  @override
  Future<void> syncSegmentStatuses(
    String territoryId,
    Map<String, SegmentStatus> statusBySegmentId,
  ) async {
    final t = await _territoryRepo.getTerritoryById(territoryId);
    if (t == null) return;
    final now = DateTime.now();
    final updated = t.segments.map((s) {
      final status = statusBySegmentId[s.id] ?? s.status;
      return s.copyWith(
        status: status,
        lastWorkedDate: status == SegmentStatus.completed ? now : null,
      );
    }).toList();
    await _territoryRepo.updateTerritory(t.copyWith(segments: updated));
  }

  @override
  Future<void> resetSegmentsForTerritory(String territoryId) async {
    final t = await _territoryRepo.getTerritoryById(territoryId);
    if (t == null) return;
    final updated = t.segments
        .map((s) => s.copyWith(status: SegmentStatus.pending, lastWorkedDate: null))
        .toList();
    await _territoryRepo.updateTerritory(t.copyWith(segments: updated));
  }

  @override
  Future<void> createSegments(
    String territoryId,
    List<SegmentModel> segments,
  ) async {
    final t = await _territoryRepo.getTerritoryById(territoryId);
    if (t == null) return;
    final existing = t.segments.toList();
    for (var i = 0; i < segments.length; i++) {
      existing.add(segments[i].copyWith(
        id: 's${territoryId}_${existing.length}',
        territoryId: territoryId,
      ));
    }
    await _territoryRepo.updateTerritory(t.copyWith(segments: existing));
  }

  @override
  Future<void> updateSegments(
    String territoryId,
    List<SegmentModel> segments,
  ) async {
    final t = await _territoryRepo.getTerritoryById(territoryId);
    if (t == null) return;
    await _territoryRepo.updateTerritory(t.copyWith(segments: segments));
  }

  @override
  Future<void> deleteSegmentsByTerritory(String territoryId) async {
    final t = await _territoryRepo.getTerritoryById(territoryId);
    if (t == null) return;
    await _territoryRepo.updateTerritory(t.copyWith(segments: []));
  }
}
