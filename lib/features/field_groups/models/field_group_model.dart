/// Named group for Sunday field service announcements (e.g. "Grupo Guaíba").
class FieldGroupModel {
  const FieldGroupModel({
    required this.id,
    required this.name,
    this.congregationId,
    this.createdAt,
  });

  final String id;
  final String name;
  final String? congregationId;
  final DateTime? createdAt;

  FieldGroupModel copyWith({
    String? id,
    String? name,
    String? congregationId,
    DateTime? createdAt,
  }) {
    return FieldGroupModel(
      id: id ?? this.id,
      name: name ?? this.name,
      congregationId: congregationId ?? this.congregationId,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'congregationId': congregationId,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  factory FieldGroupModel.fromMap(Map<String, dynamic> map) {
    return FieldGroupModel(
      id: map['id'] as String,
      name: map['name'] as String,
      congregationId: map['congregationId'] as String?,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'] as String)
          : null,
    );
  }
}
