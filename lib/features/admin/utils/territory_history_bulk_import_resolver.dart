import '../../auth/models/user_model.dart';
import '../../territories/models/segment_model.dart';
import '../../territories/models/territory_model.dart';
import 'territory_history_bulk_import_parser.dart';

class ResolvedSegmentRef {
  const ResolvedSegmentRef({
    required this.segmentId,
    required this.territoryId,
    required this.refToken,
    required this.territoryNumber,
    required this.segmentDescription,
  });

  final String segmentId;
  final String territoryId;
  final String refToken;
  final String territoryNumber;
  final String segmentDescription;
}

class ResolvedTerritoryHistoryLine {
  const ResolvedTerritoryHistoryLine({
    required this.parsed,
    required this.segments,
    required this.conductorId,
    required this.conductorNote,
    required this.unresolvedTokens,
  });

  final ParsedTerritoryHistoryLine parsed;
  final List<ResolvedSegmentRef> segments;
  final String conductorId;
  /// When dirigente was not matched to a user, explains fallback.
  final String? conductorNote;
  final List<String> unresolvedTokens;

  bool get isFullyResolved =>
      unresolvedTokens.isEmpty && segments.isNotEmpty;
}

bool _neighborhoodMatches(String? section, TerritoryModel t) {
  if (section == null || section.trim().isEmpty) return true;
  final a = section.trim().toLowerCase();
  final b = t.neighborhood.trim().toLowerCase();
  if (a == b) return true;
  if (t.shortAddress != null &&
      t.shortAddress!.toLowerCase().contains(a)) {
    return true;
  }
  return false;
}

bool territoryNumberMatches(TerritoryModel t, String numFromToken) {
  final raw = t.number?.trim();
  if (raw == null || raw.isEmpty) return false;
  final nt = numFromToken.trim();
  if (raw == nt) return true;
  String strip(String s) {
    final r = s.replaceFirst(RegExp(r'^0+'), '');
    return r.isEmpty ? '0' : r;
  }

  final a = int.tryParse(strip(raw));
  final b = int.tryParse(strip(nt));
  if (a != null && b != null && a == b) return true;
  return false;
}

/// Splits `13B` → (`13`, `B`), `08PARTE` → (`08`, `PARTE`), `15` → (`15`, null).
(String digits, String? suffix) splitTerritoryRefToken(String token) {
  final t = token.trim().replaceAll(RegExp(r'\s+'), '');
  final m = RegExp(r'^(\d+)(.*)$').firstMatch(t);
  if (m == null) return ('', null);
  final d = m.group(1)!;
  final rest = m.group(2)!.trim();
  if (rest.isEmpty) return (d, null);
  return (d, rest);
}

String _normSeg(String s) =>
    s.toLowerCase().replaceAll(RegExp(r'\s+'), '').trim();

/// Pick segments in [territory] matching [suffix]. If [suffix] is null, all segments.
List<SegmentModel> matchSegmentsInTerritory(
  TerritoryModel territory,
  String? suffix,
) {
  if (suffix == null || suffix.isEmpty) {
    return List<SegmentModel>.from(territory.segments);
  }
  final sn = _normSeg(suffix);
  return territory.segments.where((s) {
    final d = _normSeg(s.description);
    if (d == sn) return true;
    if (d.contains(sn)) return true;
    if (sn.contains(d) && d.length >= 2) return true;
    return false;
  }).toList();
}

String? resolveConductorId({
  required String conductorRaw,
  required List<UserModel> users,
  required String fallbackUserId,
}) {
  final n = normalizeConductorNameForMatch(conductorRaw);
  if (n.isEmpty) return null;

  for (final u in users) {
    if (u.name.trim().toLowerCase() == n.toLowerCase()) return u.id;
  }
  for (final u in users) {
    final un = u.name.trim().toLowerCase();
    if (un.contains(n.toLowerCase()) || n.toLowerCase().contains(un)) {
      return u.id;
    }
  }
  return null;
}

/// [filterNeighborhood] when non-null, only territories in that neighborhood (name).
List<ResolvedTerritoryHistoryLine> resolveTerritoryHistoryImport({
  required List<ParsedTerritoryHistoryLine> parsed,
  required List<TerritoryModel> territories,
  required List<UserModel> users,
  required String fallbackConductorUserId,
  String? filterNeighborhood,
}) {
  final resolved = <ResolvedTerritoryHistoryLine>[];

  for (final p in parsed) {
    final section = filterNeighborhood?.trim().isNotEmpty == true
        ? filterNeighborhood
        : p.neighborhoodSection;

    final scoped =
        territories.where((t) => _neighborhoodMatches(section, t)).toList();

    final segments = <ResolvedSegmentRef>[];
    final unresolved = <String>[];

    for (final token in p.refTokens) {
      final (digits, suffix) = splitTerritoryRefToken(token);
      if (digits.isEmpty) {
        unresolved.add(token);
        continue;
      }

      final tMatches =
          scoped.where((t) => territoryNumberMatches(t, digits)).toList();
      if (tMatches.isEmpty) {
        unresolved.add(token);
        continue;
      }
      if (tMatches.length > 1) {
        unresolved.add(token);
        continue;
      }

      final territory = tMatches.first;
      final tNum = territory.number ?? digits;
      final segMatches = matchSegmentsInTerritory(territory, suffix);

      if (segMatches.isEmpty) {
        unresolved.add(token);
        continue;
      }

      for (final s in segMatches) {
        segments.add(
          ResolvedSegmentRef(
            segmentId: s.id,
            territoryId: territory.id,
            refToken: token,
            territoryNumber: tNum,
            segmentDescription: s.description,
          ),
        );
      }
    }

    final matched = resolveConductorId(
      conductorRaw: p.conductorRaw,
      users: users,
      fallbackUserId: fallbackConductorUserId,
    );
    final conductorId = matched ?? fallbackConductorUserId;
    final note = matched == null
        ? 'Dirigente na lista: ${normalizeConductorNameForMatch(p.conductorRaw)}'
        : null;

    resolved.add(
      ResolvedTerritoryHistoryLine(
        parsed: p,
        segments: segments,
        conductorId: conductorId,
        conductorNote: note,
        unresolvedTokens: unresolved,
      ),
    );
  }

  return resolved;
}
