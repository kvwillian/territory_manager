import 'package:csv/csv.dart';

import 'territory_history_bulk_import_parser.dart';

/// Cabeçalhos aceites (minúsculas, sem acento na chave lógica — ver [_canonicalHeader]).
///
/// **Obrigatórias**
/// - [data] — ver [parseImportDate]
/// - [bairro] — nome do bairro (como no app)
/// - [territorio] — número do território (ex.: `15`, `01`)
///
/// **Opcionais**
/// - [segmento] — vazio = todo o território; senão sufixo(s) separados por vírgula
///   (ex.: `A` → token `15A`; `A, B` → `15A`, `15B`)
/// - [dirigente] — nome para casar com utilizador
/// - [notas] — texto livre (vai para a sessão de trabalho)
///
/// Exemplo:
/// ```csv
/// data,bairro,territorio,segmento,dirigente,notas
/// 2026-04-19,Laranjeiras,15,,Bessa,
/// 2026-04-19,Laranjeiras,16,,Bessa,
/// 2026-04-21,Laranjeiras,13,B,Eber,
/// ```
const territoryHistoryCsvSpecDescription = 'CSV: data,bairro,territorio[,segmento,dirigente,notas]';

String _normalizeHeaderToken(String raw) {
  var s = raw.toLowerCase().trim().replaceAll('"', '').replaceAll("'", '');
  const map = {
    'á': 'a',
    'à': 'a',
    'â': 'a',
    'ã': 'a',
    'é': 'e',
    'ê': 'e',
    'í': 'i',
    'ó': 'o',
    'ô': 'o',
    'õ': 'o',
    'ú': 'u',
    'ç': 'c',
  };
  for (final e in map.entries) {
    s = s.replaceAll(e.key, e.value);
  }
  return s.replaceAll(RegExp(r'\s+'), '_');
}

/// Aceita **YYYY-MM-DD** (recomendado), **DD/MM/AAAA** ou **DD-MM-AAAA**.
/// Anos com 2 dígitos: assume 20xx.
DateTime? parseImportDate(String raw) {
  final s = raw.trim();
  if (s.isEmpty) return null;

  final iso = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(s);
  if (iso != null) {
    final y = int.parse(iso.group(1)!);
    final m = int.parse(iso.group(2)!);
    final d = int.parse(iso.group(3)!);
    return DateTime(y, m, d);
  }

  final br = RegExp(r'^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$').firstMatch(s);
  if (br != null) {
    final d = int.parse(br.group(1)!);
    final m = int.parse(br.group(2)!);
    var y = int.parse(br.group(3)!);
    if (y < 100) y += 2000;
    return DateTime(y, m, d);
  }

  return null;
}

String? _canonicalHeader(String headerCell) {
  final key = _normalizeHeaderToken(headerCell);
  const aliases = <String, String>{
    'data': 'data',
    'date': 'data',
    'data_trabalho': 'data',
    'bairro': 'bairro',
    'neighborhood': 'bairro',
    'territorio': 'territorio',
    'territorio_numero': 'territorio',
    'numero_territorio': 'territorio',
    'nr_territorio': 'territorio',
    'n_territorio': 'territorio',
    'segmento': 'segmento',
    'segmentos': 'segmento',
    'segment': 'segmento',
    'dirigente': 'dirigente',
    'conductor': 'dirigente',
    'dirigente_nome': 'dirigente',
    'notas': 'notas',
    'notes': 'notas',
    'obs': 'notas',
    'observacoes': 'notas',
  };
  return aliases[key];
}

List<String> _refTokensFromTerritoryAndSegmentColumn(
  String territorio,
  String segmentoColumn,
) {
  final tn = territorio.trim();
  if (tn.isEmpty) return [];
  final seg = segmentoColumn.trim();
  if (seg.isEmpty) return [tn];
  final parts = seg
      .split(',')
      .map((e) => e.trim())
      .where((e) => e.isNotEmpty)
      .toList();
  if (parts.isEmpty) return [tn];
  return parts.map((p) => '$tn$p').toList();
}

int _countChar(String s, String ch) => ch.allMatches(s).length;

String _detectCsvDelimiter(String text) {
  final firstLine = text.split(RegExp(r'\r?\n')).first;
  final commas = _countChar(firstLine, ',');
  final semis = _countChar(firstLine, ';');
  if (semis > commas) return ';';
  return ',';
}

/// Primeira linha = cabeçalho; demais = dados. Separador: `,` ou `;` (o mais frequente na 1.ª linha).
List<ParsedTerritoryHistoryLine> parseTerritoryHistoryCsv(String text) {
  final t = text.trim();
  if (t.isEmpty) return [];

  final fieldDelimiter = _detectCsvDelimiter(t);
  final rows = CsvToListConverter(
    fieldDelimiter: fieldDelimiter,
    shouldParseNumbers: false,
    eol: '\n',
  ).convert(t.replaceAll('\r\n', '\n'));

  if (rows.length < 2) return [];

  final headerCells = rows.first.map((e) => e.toString()).toList();
  final col = <String, int>{};
  for (var i = 0; i < headerCells.length; i++) {
    final c = _canonicalHeader(headerCells[i]);
    if (c != null) col[c] = i;
  }

  if (!col.containsKey('data') ||
      !col.containsKey('bairro') ||
      !col.containsKey('territorio')) {
    return [];
  }

  String cell(List<dynamic> row, String key) {
    final idx = col[key];
    if (idx == null || idx >= row.length) return '';
    return row[idx].toString().trim();
  }

  final out = <ParsedTerritoryHistoryLine>[];
  for (var r = 1; r < rows.length; r++) {
    final row = rows[r];
    if (row.isEmpty || row.every((e) => e.toString().trim().isEmpty)) {
      continue;
    }

    final dateStr = cell(row, 'data');
    final date = parseImportDate(dateStr);
    if (date == null) continue;

    final bairro = cell(row, 'bairro');
    final terr = cell(row, 'territorio');
    if (bairro.isEmpty || terr.isEmpty) continue;

    final segCol = cell(row, 'segmento');
    final dirigente = cell(row, 'dirigente');
    final notas = cell(row, 'notas');

    final refTokens = _refTokensFromTerritoryAndSegmentColumn(terr, segCol);
    if (refTokens.isEmpty) continue;

    final rawParts = <String>[dateStr, bairro, terr, if (segCol.isNotEmpty) segCol, dirigente];
    out.add(
      ParsedTerritoryHistoryLine(
        sourceLineNumber: r + 1,
        day: date.day,
        month: date.month,
        conductorRaw: dirigente,
        refTokens: refTokens,
        neighborhoodSection: bairro,
        rawLine: rawParts.join(' · '),
        resolvedDate: date,
        rowNotes: notas.isEmpty ? null : notas,
      ),
    );
  }
  return out;
}

bool _firstLineLooksLikeTerritoryCsv(String text) {
  final first = text.trimLeft().split(RegExp(r'\r?\n')).first;
  final n = _normalizeHeaderToken(first);
  return n.contains('data') && n.contains('bairro') && n.contains('territorio');
}

/// Tenta CSV (cabeçalho com data, bairro, territorio); senão usa o formato texto livre.
List<ParsedTerritoryHistoryLine> parseTerritoryImport(String text) {
  if (_firstLineLooksLikeTerritoryCsv(text)) {
    final csv = parseTerritoryHistoryCsv(text);
    if (csv.isNotEmpty) return csv;
  }
  return parseTerritoryHistoryBulkText(text);
}
