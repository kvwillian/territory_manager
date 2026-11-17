/// Congregation model for multi-tenant isolation.
class CongregationModel {
  const CongregationModel({
    required this.id,
    required this.name,
    required this.city,
    required this.country,
    this.state,
    this.createdAt,
    this.createdBy,
    this.midweekWeekday,
    this.midweekTime,
    this.weekendWeekday,
    this.weekendTime,
  });

  final String id;
  final String name;
  final String city;
  final String country;
  final String? state;
  final DateTime? createdAt;
  final String? createdBy;

  /// 1 = segunda-feira … 7 = domingo. Null enquanto o horário não foi definido.
  final int? midweekWeekday;
  /// Horário local no formato HH:mm.
  final String? midweekTime;
  final int? weekendWeekday;
  final String? weekendTime;

  CongregationModel copyWith({
    String? id,
    String? name,
    String? city,
    String? country,
    String? state,
    DateTime? createdAt,
    String? createdBy,
    int? midweekWeekday,
    String? midweekTime,
    int? weekendWeekday,
    String? weekendTime,
  }) {
    return CongregationModel(
      id: id ?? this.id,
      name: name ?? this.name,
      city: city ?? this.city,
      country: country ?? this.country,
      state: state ?? this.state,
      createdAt: createdAt ?? this.createdAt,
      createdBy: createdBy ?? this.createdBy,
      midweekWeekday: midweekWeekday ?? this.midweekWeekday,
      midweekTime: midweekTime ?? this.midweekTime,
      weekendWeekday: weekendWeekday ?? this.weekendWeekday,
      weekendTime: weekendTime ?? this.weekendTime,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'city': city,
      'country': country,
      if (state != null && state!.isNotEmpty) 'state': state,
      'createdAt': createdAt?.toIso8601String(),
      'createdBy': createdBy,
      'midweekWeekday': midweekWeekday,
      'midweekTime': midweekTime,
      'weekendWeekday': weekendWeekday,
      'weekendTime': weekendTime,
    };
  }

  factory CongregationModel.fromMap(Map<String, dynamic> map) {
    final rawState = map['state'] ?? map['estado'] ?? map['uf'];
    final stateText = rawState is String && rawState.trim().isNotEmpty
        ? rawState.trim()
        : null;
    return CongregationModel(
      id: map['id'] as String,
      name: map['name'] as String,
      city: map['city'] as String,
      country: map['country'] as String,
      state: stateText,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'] as String)
          : null,
      createdBy: map['createdBy'] as String?,
      midweekWeekday: congregationWeekday(map['midweekWeekday']),
      midweekTime: map['midweekTime'] as String?,
      weekendWeekday: congregationWeekday(map['weekendWeekday']),
      weekendTime: map['weekendTime'] as String?,
    );
  }
}

int? congregationWeekday(Object? value) {
  if (value is! num) return null;
  final day = value.toInt();
  if (day < DateTime.monday || day > DateTime.sunday) return null;
  return day;
}

const congregationWeekdayLabels = <int, String>{
  DateTime.monday: 'Segunda-feira',
  DateTime.tuesday: 'Terça-feira',
  DateTime.wednesday: 'Quarta-feira',
  DateTime.thursday: 'Quinta-feira',
  DateTime.friday: 'Sexta-feira',
  DateTime.saturday: 'Sábado',
  DateTime.sunday: 'Domingo',
};
