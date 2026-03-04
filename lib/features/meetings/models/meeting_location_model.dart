/// Meeting location represents where a preaching group starts field service.
/// Admins define allowedTerritories manually; future versions may filter by
/// geographic distance using radiusKm.
class MeetingLocationModel {
  const MeetingLocationModel({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusKm,
    this.address,
    this.shortLocation,
    this.houseNumber,
    this.allowedTerritories = const [],
    this.congregationId,
    this.createdAt,
  });

  final String id;
  final String name;
  /// Full address (e.g. from geocoding). Shown only in detail/edit screens.
  final String? address;
  /// Short location for list display (e.g. "Rua X, 504, Bairro, Cidade - SP").
  final String? shortLocation;
  /// House/building number.
  final String? houseNumber;
  final double latitude;
  final double longitude;
  final double radiusKm;
  final List<String> allowedTerritories;
  final String? congregationId;
  final DateTime? createdAt;

  /// Backward compatibility: radius in meters.
  double get radiusMeters => radiusKm * 1000;

  MeetingLocationModel copyWith({
    String? id,
    String? name,
    String? address,
    String? shortLocation,
    String? houseNumber,
    double? latitude,
    double? longitude,
    double? radiusKm,
    List<String>? allowedTerritories,
    String? congregationId,
    DateTime? createdAt,
  }) {
    return MeetingLocationModel(
      id: id ?? this.id,
      name: name ?? this.name,
      address: address ?? this.address,
      shortLocation: shortLocation ?? this.shortLocation,
      houseNumber: houseNumber ?? this.houseNumber,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      radiusKm: radiusKm ?? this.radiusKm,
      allowedTerritories: allowedTerritories ?? this.allowedTerritories,
      congregationId: congregationId ?? this.congregationId,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// Derives a short location string from a full Nominatim-style address
  /// by removing regional suffixes (Região..., Brasil, etc.).
  static String deriveShortLocation(String fullAddress) {
    final lower = fullAddress.toLowerCase();
    final regiaoIdx = lower.indexOf('região');
    if (regiaoIdx > 0) {
      return fullAddress.substring(0, regiaoIdx).trim().replaceAll(RegExp(r',\s*$'), '');
    }
    final brasilIdx = lower.lastIndexOf(', brasil');
    if (brasilIdx > 0) {
      return fullAddress.substring(0, brasilIdx).trim();
    }
    if (fullAddress.length > 100) {
      return '${fullAddress.substring(0, 97)}...';
    }
    return fullAddress;
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'shortLocation': shortLocation,
      'houseNumber': houseNumber,
      'latitude': latitude,
      'longitude': longitude,
      'radiusKm': radiusKm,
      'allowedTerritories': allowedTerritories,
      'congregationId': congregationId,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  factory MeetingLocationModel.fromMap(Map<String, dynamic> map) {
    final radiusKm = map['radiusKm'] != null
        ? (map['radiusKm'] as num).toDouble()
        : (map['radiusMeters'] as num?)?.toDouble() ?? 2.0;
    return MeetingLocationModel(
      id: map['id'] as String,
      name: map['name'] as String,
      address: map['address'] as String?,
      shortLocation: map['shortLocation'] as String?,
      houseNumber: map['houseNumber'] as String?,
      latitude: (map['latitude'] as num).toDouble(),
      longitude: (map['longitude'] as num).toDouble(),
      radiusKm: radiusKm,
      allowedTerritories:
          (map['allowedTerritories'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      congregationId: map['congregationId'] as String?,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'] as String)
          : null,
    );
  }
}
