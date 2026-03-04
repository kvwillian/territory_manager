/// Work session record from a preaching session.
class WorkSessionModel {
  const WorkSessionModel({
    required this.id,
    required this.date,
    required this.conductorId,
    required this.territoryId,
    required this.segmentsWorked,
    this.notes,
    this.congregationId,
  });

  final String id;
  final DateTime date;
  final String conductorId;
  final String territoryId;
  final List<String> segmentsWorked;
  final String? notes;
  final String? congregationId;

  WorkSessionModel copyWith({
    String? id,
    DateTime? date,
    String? conductorId,
    String? territoryId,
    List<String>? segmentsWorked,
    String? notes,
    String? congregationId,
  }) {
    return WorkSessionModel(
      id: id ?? this.id,
      date: date ?? this.date,
      conductorId: conductorId ?? this.conductorId,
      territoryId: territoryId ?? this.territoryId,
      segmentsWorked: segmentsWorked ?? this.segmentsWorked,
      notes: notes ?? this.notes,
      congregationId: congregationId ?? this.congregationId,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'conductorId': conductorId,
      'territoryId': territoryId,
      'segmentsWorked': segmentsWorked,
      'notes': notes,
      'congregationId': congregationId,
    };
  }

  factory WorkSessionModel.fromMap(Map<String, dynamic> map) {
    return WorkSessionModel(
      id: map['id'] as String,
      date: DateTime.parse(map['date'] as String),
      conductorId: map['conductorId'] as String,
      territoryId: map['territoryId'] as String,
      segmentsWorked:
          (map['segmentsWorked'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      notes: map['notes'] as String?,
      congregationId: map['congregationId'] as String?,
    );
  }
}
