/// Bairro (neighborhood) - geographic area that groups territories.
class NeighborhoodModel {
  const NeighborhoodModel({
    required this.id,
    required this.name,
    this.congregationId,
  });

  final String id;
  final String name;
  final String? congregationId;

  NeighborhoodModel copyWith({
    String? id,
    String? name,
    String? congregationId,
  }) {
    return NeighborhoodModel(
      id: id ?? this.id,
      name: name ?? this.name,
      congregationId: congregationId ?? this.congregationId,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'congregationId': congregationId,
    };
  }

  factory NeighborhoodModel.fromMap(Map<String, dynamic> map) {
    return NeighborhoodModel(
      id: map['id'] as String,
      name: map['name'] as String,
      congregationId: map['congregationId'] as String?,
    );
  }
}
