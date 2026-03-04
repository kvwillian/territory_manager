import 'segment_model.dart';

/// Territory represents a small geographic area assigned for preaching work.
class TerritoryModel {
  const TerritoryModel({
    required this.id,
    required this.name,
    required this.neighborhood,
    this.neighborhoodId,
    this.number,
    this.address,
    this.shortAddress,
    this.imageUrl,
    this.mapsUrl,
    this.centroidLat,
    this.centroidLng,
    this.segments = const [],
    this.congregationId,
  });

  final String id;
  final String name;
  /// Neighborhood name (display). When neighborhoodId is set, sync from Bairro.
  final String neighborhood;
  /// Reference to neighborhood (bairro). When set, territory belongs to that bairro.
  final String? neighborhoodId;
  /// Territory number (e.g. "01", "42").
  final String? number;
  /// Address from geocoding (street search + select).
  final String? address;
  /// Short address for list display (derived from address when saving).
  final String? shortAddress;
  final String? imageUrl;
  final String? mapsUrl;
  final double? centroidLat;
  final double? centroidLng;
  final List<SegmentModel> segments;
  final String? congregationId;

  /// Backward compatibility.
  double? get latitude => centroidLat;
  double? get longitude => centroidLng;

  int get completedCount =>
      segments.where((s) => s.isCompleted).length;
  int get pendingCount =>
      segments.where((s) => s.isPending).length;
  int get totalSegments => segments.length;
  double get progress =>
      totalSegments > 0 ? completedCount / totalSegments : 0.0;

  TerritoryModel copyWith({
    String? id,
    String? name,
    String? neighborhood,
    String? neighborhoodId,
    String? number,
    String? address,
    String? shortAddress,
    String? imageUrl,
    String? mapsUrl,
    double? centroidLat,
    double? centroidLng,
    List<SegmentModel>? segments,
    String? congregationId,
  }) {
    return TerritoryModel(
      id: id ?? this.id,
      name: name ?? this.name,
      neighborhood: neighborhood ?? this.neighborhood,
      neighborhoodId: neighborhoodId ?? this.neighborhoodId,
      number: number ?? this.number,
      address: address ?? this.address,
      shortAddress: shortAddress ?? this.shortAddress,
      imageUrl: imageUrl ?? this.imageUrl,
      mapsUrl: mapsUrl ?? this.mapsUrl,
      centroidLat: centroidLat ?? this.centroidLat,
      centroidLng: centroidLng ?? this.centroidLng,
      segments: segments ?? this.segments,
      congregationId: congregationId ?? this.congregationId,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'neighborhood': neighborhood,
      'neighborhoodId': neighborhoodId,
      'number': number,
      'address': address,
      'shortAddress': shortAddress,
      'imageUrl': imageUrl,
      'mapsUrl': mapsUrl,
      'centroidLat': centroidLat,
      'centroidLng': centroidLng,
      'congregationId': congregationId,
    };
  }

  factory TerritoryModel.fromMap(Map<String, dynamic> map) {
    final centroidLat = (map['centroidLat'] ?? map['latitude']) != null
        ? ((map['centroidLat'] ?? map['latitude']) as num).toDouble()
        : null;
    final centroidLng = (map['centroidLng'] ?? map['longitude']) != null
        ? ((map['centroidLng'] ?? map['longitude']) as num).toDouble()
        : null;
    return TerritoryModel(
      id: map['id'] as String,
      name: map['name'] as String,
      neighborhood: map['neighborhood'] as String,
      neighborhoodId: map['neighborhoodId'] as String?,
      number: map['number'] as String?,
      address: map['address'] as String?,
      shortAddress: map['shortAddress'] as String?,
      imageUrl: map['imageUrl'] as String?,
      mapsUrl: map['mapsUrl'] as String?,
      centroidLat: centroidLat,
      centroidLng: centroidLng,
      segments: (map['segments'] as List<dynamic>?)
              ?.map((e) => SegmentModel.fromMap(e as Map<String, dynamic>))
              .toList() ??
          [],
      congregationId: map['congregationId'] as String?,
    );
  }
}
