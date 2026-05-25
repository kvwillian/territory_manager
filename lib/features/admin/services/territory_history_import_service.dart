import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../assignments/models/work_session_model.dart';
import '../data/mock_segment_repository.dart';
import '../data/mock_work_session_repository.dart';
import '../utils/territory_history_bulk_import_resolver.dart';

final territoryHistoryImportServiceProvider =
    Provider<TerritoryHistoryImportService>((ref) {
  return TerritoryHistoryImportService(ref);
});

class TerritoryHistoryImportResult {
  const TerritoryHistoryImportResult({
    required this.segmentsUpdated,
    required this.workSessionsCreated,
  });

  final int segmentsUpdated;
  final int workSessionsCreated;
}

/// Applies resolved import: segment completion dates + work session rows.
class TerritoryHistoryImportService {
  TerritoryHistoryImportService(this._ref);

  final Ref _ref;

  Future<TerritoryHistoryImportResult> apply({
    required List<ResolvedTerritoryHistoryLine> resolved,
    required int year,
    String? congregationId,
  }) async {
    final segmentRepo = _ref.read(segmentRepositoryProvider);
    final workRepo = _ref.read(workSessionRepositoryProvider);

    final segmentToDate = <String, DateTime>{};
    for (final line in resolved) {
      if (line.segments.isEmpty) continue;
      final dt = line.parsed.toDateTime(year);
      for (final s in line.segments) {
        segmentToDate.update(
          s.segmentId,
          (old) => old.isAfter(dt) ? old : dt,
          ifAbsent: () => dt,
        );
      }
    }

    if (segmentToDate.isNotEmpty) {
      await segmentRepo.setSegmentsCompletedWithDates(segmentToDate);
    }

    var sessions = 0;
    for (final line in resolved) {
      if (line.segments.isEmpty) continue;
      final dt = line.parsed.toDateTime(year);
      final byTerritory = <String, List<ResolvedSegmentRef>>{};
      for (final s in line.segments) {
        byTerritory.putIfAbsent(s.territoryId, () => []).add(s);
      }
      final noteParts = <String>[
        'Importação · linha ${line.parsed.sourceLineNumber}',
        if (line.conductorNote != null) line.conductorNote!,
        if (line.parsed.rowNotes != null && line.parsed.rowNotes!.trim().isNotEmpty)
          line.parsed.rowNotes!.trim(),
      ];
      final notes = noteParts.join(' · ');
      for (final e in byTerritory.entries) {
        final ids = e.value.map((r) => r.segmentId).toSet().toList();
        await workRepo.createWorkSession(
          WorkSessionModel(
            id: '',
            date: dt,
            conductorId: line.conductorId,
            territoryId: e.key,
            segmentsWorked: ids,
            notes: notes,
            congregationId: congregationId,
          ),
        );
        sessions++;
      }
    }

    return TerritoryHistoryImportResult(
      segmentsUpdated: segmentToDate.length,
      workSessionsCreated: sessions,
    );
  }
}
