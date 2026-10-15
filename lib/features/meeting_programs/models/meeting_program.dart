class MeetingRole {
  const MeetingRole({required this.label, required this.personName});

  final String label;
  final String personName;

  factory MeetingRole.fromMap(Map<String, dynamic> map) {
    return MeetingRole(
      label: map['label'] as String? ?? 'Participante',
      personName: map['personName'] as String? ?? '',
    );
  }
}

class MeetingPart {
  const MeetingPart({required this.title, required this.roles});

  final String title;
  final List<MeetingRole> roles;

  factory MeetingPart.fromMap(Map<String, dynamic> map) {
    final roles = map['roles'];
    return MeetingPart(
      title: map['title'] as String? ?? '',
      roles: roles is List
          ? roles.whereType<Map>().map((item) => MeetingRole.fromMap(Map<String, dynamic>.from(item))).toList()
          : const [],
    );
  }
}

class MeetingSection {
  const MeetingSection({required this.title, required this.parts});

  final String title;
  final List<MeetingPart> parts;

  factory MeetingSection.fromMap(Map<String, dynamic> map) {
    final parts = map['parts'];
    return MeetingSection(
      title: map['title'] as String? ?? '',
      parts: parts is List
          ? parts.whereType<Map>().map((item) => MeetingPart.fromMap(Map<String, dynamic>.from(item))).toList()
          : const [],
    );
  }
}

class MeetingDuty {
  const MeetingDuty({required this.label, required this.people});

  final String label;
  final List<String> people;

  factory MeetingDuty.fromMap(Map<String, dynamic> map) {
    final people = map['people'];
    return MeetingDuty(
      label: map['label'] as String? ?? '',
      people: people is List ? people.map((item) => item.toString()).where((item) => item.trim().isNotEmpty).toList() : const [],
    );
  }
}

class MeetingProgram {
  const MeetingProgram({
    required this.id,
    required this.kind,
    required this.date,
    required this.time,
    required this.status,
    required this.sections,
    required this.duties,
  });

  final String id;
  final String kind;
  final DateTime date;
  final String time;
  final String status;
  final List<MeetingSection> sections;
  final List<MeetingDuty> duties;

  String get title => kind == 'weekend' ? 'Reunião de fim de semana' : 'Reunião de meio de semana';

  bool isOn(DateTime day) => date.year == day.year && date.month == day.month && date.day == day.day;

  factory MeetingProgram.fromDoc(String id, Map<String, dynamic> map) {
    final iso = map['isoDate'] as String? ?? '';
    final parts = iso.split('-');
    final date = parts.length == 3
        ? DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]))
        : DateTime(1970);
    final sections = map['sections'];
    final duties = map['duties'];
    return MeetingProgram(
      id: id,
      kind: map['kind'] as String? ?? 'midweek',
      date: date,
      time: map['time'] as String? ?? '',
      status: map['status'] as String? ?? 'draft',
      sections: sections is List
          ? sections.whereType<Map>().map((item) => MeetingSection.fromMap(Map<String, dynamic>.from(item))).toList()
          : const [],
      duties: duties is List
          ? duties.whereType<Map>().map((item) => MeetingDuty.fromMap(Map<String, dynamic>.from(item))).toList()
          : const [],
    );
  }
}
