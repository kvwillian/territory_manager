/// Assignment links a group to a territory for a specific date.
class AssignmentModel {
  const AssignmentModel({
    required this.id,
    required this.date,
    required this.groupId,
    required this.territoryId,
    this.congregationId,
  });

  final String id;
  final DateTime date;
  final String groupId;
  final String territoryId;
  final String? congregationId;

  AssignmentModel copyWith({
    String? id,
    DateTime? date,
    String? groupId,
    String? territoryId,
    String? congregationId,
  }) {
    return AssignmentModel(
      id: id ?? this.id,
      date: date ?? this.date,
      groupId: groupId ?? this.groupId,
      territoryId: territoryId ?? this.territoryId,
      congregationId: congregationId ?? this.congregationId,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'groupId': groupId,
      'territoryId': territoryId,
      'congregationId': congregationId,
    };
  }

  factory AssignmentModel.fromMap(Map<String, dynamic> map) {
    return AssignmentModel(
      id: map['id'] as String,
      date: DateTime.parse(map['date'] as String),
      groupId: map['groupId'] as String,
      territoryId: map['territoryId'] as String,
      congregationId: map['congregationId'] as String?,
    );
  }
}
