/// Group represents a preaching group linked to a meeting location.
class GroupModel {
  const GroupModel({
    required this.id,
    required this.name,
    required this.meetingLocationId,
    this.congregationId,
  });

  final String id;
  final String name;
  final String meetingLocationId;
  final String? congregationId;

  GroupModel copyWith({
    String? id,
    String? name,
    String? meetingLocationId,
    String? congregationId,
  }) {
    return GroupModel(
      id: id ?? this.id,
      name: name ?? this.name,
      meetingLocationId: meetingLocationId ?? this.meetingLocationId,
      congregationId: congregationId ?? this.congregationId,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'meetingLocationId': meetingLocationId,
      'congregationId': congregationId,
    };
  }

  factory GroupModel.fromMap(Map<String, dynamic> map) {
    return GroupModel(
      id: map['id'] as String,
      name: map['name'] as String,
      meetingLocationId: map['meetingLocationId'] as String,
      congregationId: map['congregationId'] as String?,
    );
  }
}
