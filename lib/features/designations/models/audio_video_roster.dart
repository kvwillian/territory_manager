class AudioVideoRoster {
  const AudioVideoRoster({required this.label, required this.rows});

  final String label;
  final List<AudioVideoRow> rows;

  factory AudioVideoRoster.fromDoc(Map<String, dynamic> map) {
    final year = map['year'];
    final month = map['month'];
    final rows = map['rows'];
    return AudioVideoRoster(
      label: year is num && month is num ? '${month.toInt().toString().padLeft(2, '0')}/${year.toInt()}' : 'Mês',
      rows: rows is List
          ? rows.whereType<Map>().map((item) => AudioVideoRow.fromMap(Map<String, dynamic>.from(item))).toList()
          : const [],
    );
  }
}

class AudioVideoRow {
  const AudioVideoRow({
    required this.day,
    required this.attendants,
    required this.microphones,
    required this.sound,
  });

  final int day;
  final String attendants;
  final String microphones;
  final String sound;

  factory AudioVideoRow.fromMap(Map<String, dynamic> map) {
    String pair(Object? value) {
      if (value is! List) return '';
      return value.map((item) => item.toString().trim()).where((item) => item.isNotEmpty).join(', ');
    }

    return AudioVideoRow(
      day: map['day'] is num ? (map['day'] as num).toInt() : 0,
      attendants: pair(map['attendants']),
      microphones: pair(map['microphones']),
      sound: pair(map['sound']),
    );
  }
}
