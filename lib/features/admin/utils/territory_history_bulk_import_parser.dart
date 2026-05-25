/// Parsed line from a manual territory history list (e.g. WhatsApp / notes).
class ParsedTerritoryHistoryLine {
  const ParsedTerritoryHistoryLine({
    required this.sourceLineNumber,
    required this.day,
    required this.month,
    required this.conductorRaw,
    required this.refTokens,
    required this.neighborhoodSection,
    required this.rawLine,
    this.resolvedDate,
    this.rowNotes,
  });

  final int sourceLineNumber;
  final int day;
  final int month;
  final String conductorRaw;
  final List<String> refTokens;
  /// Last non-data heading line before this row (e.g. "Laranjeiras").
  final String? neighborhoodSection;
  final String rawLine;
  /// Data completa (import CSV). Se não for null, [toDateTime] ignora [year].
  final DateTime? resolvedDate;
  /// Coluna opcional `notas` do CSV.
  final String? rowNotes;

  /// Uses [year] quando [resolvedDate] é null (formato texto DD.MM).
  DateTime toDateTime(int year) =>
      resolvedDate ?? DateTime(year, month, day);
}

/// Extracts structured rows from pasted text.
///
/// Expected data rows: `DD.MM - Dirigente - refs` where refs are comma-separated
/// tokens like `15`, `16`, `07b`, `08PARTE`, `19Bfinal`.
///
/// Non-data non-empty lines set "section" context (neighborhood name), e.g. `Laranjeiras`.
/// Lines like `●●●MAIO 26●●●` are ignored (month/year is taken from each DD.MM + dialog year).
List<ParsedTerritoryHistoryLine> parseTerritoryHistoryBulkText(String text) {
  final lines = text.split(RegExp(r'\r?\n'));
  final out = <ParsedTerritoryHistoryLine>[];
  String? currentSection;

  final dataRow = RegExp(
    r'^\s*(\d{1,2})\.(\d{1,2})\s*-\s*(.+?)\s*-\s*(.+)\s*$',
  );

  for (var i = 0; i < lines.length; i++) {
    final raw = lines[i];
    final line = raw.trimRight();
    if (line.trim().isEmpty) continue;

    final trimmed = line.trim();
    final m = dataRow.firstMatch(trimmed);
    if (m != null) {
      final day = int.parse(m.group(1)!);
      final month = int.parse(m.group(2)!);
      final conductor = m.group(3)!.trim();
      final refsPart = m.group(4)!.trim();
      final tokens = refsPart
          .split(',')
          .map((t) => t.trim())
          .where((t) => t.isNotEmpty)
          .toList();
      out.add(
        ParsedTerritoryHistoryLine(
          sourceLineNumber: i + 1,
          day: day,
          month: month,
          conductorRaw: conductor,
          refTokens: tokens,
          neighborhoodSection: currentSection,
          rawLine: trimmed,
          resolvedDate: null,
          rowNotes: null,
        ),
      );
      continue;
    }

    if (trimmed.contains('●')) continue;

    currentSection = trimmed;
  }

  return out;
}

/// Removes parenthetical notes like `(17hs)` for name matching.
String normalizeConductorNameForMatch(String raw) {
  var s = raw.trim();
  s = s.replaceAll(RegExp(r'\s*\([^)]*\)'), ' ');
  s = s.replaceAll(RegExp(r'\s+'), ' ').trim();
  return s;
}
