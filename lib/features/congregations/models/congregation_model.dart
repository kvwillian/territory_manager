/// Congregation model for multi-tenant isolation.
class CongregationModel {
  const CongregationModel({
    required this.id,
    required this.name,
    required this.city,
    required this.country,
    this.createdAt,
    this.createdBy,
  });

  final String id;
  final String name;
  final String city;
  final String country;
  final DateTime? createdAt;
  final String? createdBy;

  CongregationModel copyWith({
    String? id,
    String? name,
    String? city,
    String? country,
    DateTime? createdAt,
    String? createdBy,
  }) {
    return CongregationModel(
      id: id ?? this.id,
      name: name ?? this.name,
      city: city ?? this.city,
      country: country ?? this.country,
      createdAt: createdAt ?? this.createdAt,
      createdBy: createdBy ?? this.createdBy,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'city': city,
      'country': country,
      'createdAt': createdAt?.toIso8601String(),
      'createdBy': createdBy,
    };
  }

  factory CongregationModel.fromMap(Map<String, dynamic> map) {
    return CongregationModel(
      id: map['id'] as String,
      name: map['name'] as String,
      city: map['city'] as String,
      country: map['country'] as String,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'] as String)
          : null,
      createdBy: map['createdBy'] as String?,
    );
  }
}
