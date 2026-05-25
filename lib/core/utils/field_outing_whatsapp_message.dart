import 'package:intl/intl.dart';

/// Join names for WhatsApp (e.g. "Carlos – Marcos") using en dash.
String joinDirigentesNames(List<String> names) {
  if (names.isEmpty) return '—';
  return names.join(' – ');
}

/// Portuguese list: "a, b, c e d"
String joinPortugueseTerritoryList(List<String> labels) {
  if (labels.isEmpty) return '—';
  if (labels.length == 1) return labels.first;
  if (labels.length == 2) return '${labels[0]} e ${labels[1]}';
  return '${labels.sublist(0, labels.length - 1).join(', ')} e ${labels.last}';
}

String _capitalizePtWeekday(String raw) {
  if (raw.isEmpty) return raw;
  return raw[0].toUpperCase() + raw.substring(1);
}

/// Terça–sábado (e demais dias que não sejam domingo): saída da manhã + convites.
String buildMorningFieldOutingWhatsappMessage({
  required DateTime date,
  required String localName,
  required String dirigentesLine,
  required String territoriesLine,
}) {
  final weekdayRaw = DateFormat('EEEE', 'pt_BR').format(date);
  final weekday = _capitalizePtWeekday(weekdayRaw);
  final d = DateFormat('dd/MM/yy', 'pt_BR').format(date);
  final local = localName.trim().isEmpty ? '—' : localName.trim();
  return '🌅 *SAÍDA DA MANHÃ – $weekday ($d)**\n\n'
      '📍 *Local:* $local\n'
      '👥 (*Dirigentes:* $dirigentesLine)\n\n'
      '📌 *Territórios:* $territoriesLine\n\n'
      'Muito obrigado pela disposição. Ótimo trabalho a todos! 👏';
}

/// Domingo: saída de campo + nome do grupo cadastrado.
String buildSundayFieldOutingWhatsappMessage({
  required DateTime date,
  required String groupName,
  required String dirigentesLine,
  required String territoriesLine,
}) {
  final d = DateFormat('dd/MM/yy', 'pt_BR').format(date);
  final group = groupName.trim().isEmpty ? '—' : groupName.trim();
  return '🌅 **SAÍDA DE CAMPO – DOMINGO ($d)**\n\n'
      '📍 **$group**\n'
      '👥 (**Dirigentes:** $dirigentesLine)\n\n'
      '📌 **Territórios:** $territoriesLine\n\n'
      'Muito obrigado pela disposição. Ótimo trabalho a todos! 👏';
}

/// `true` for Sunday field outing template.
bool isSundayAssignmentDate(DateTime date) =>
    date.weekday == DateTime.sunday;
