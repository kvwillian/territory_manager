import 'dart:convert';

import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

/// Result of a location pick operation.
class LocationResult {
  const LocationResult({
    required this.latitude,
    required this.longitude,
    this.address,
  });

  final double latitude;
  final double longitude;
  final String? address;
}

/// Service for picking location via GPS or address geocoding.
/// Uses device GPS and OpenStreetMap Nominatim (free, no API key).
class LocationPickerService {
  /// Gets the device's current location.
  /// Requires location permission.
  Future<LocationResult> getCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw LocationPickerException('Serviço de localização desativado');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      throw LocationPickerException(
        'Permissão de localização negada permanentemente',
      );
    }
    if (permission == LocationPermission.denied) {
      throw LocationPickerException('Permissão de localização negada');
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
      ),
    );

    return LocationResult(
      latitude: position.latitude,
      longitude: position.longitude,
    );
  }

  /// Geocodes an address to coordinates using OpenStreetMap Nominatim.
  /// Free to use, no API key required.
  Future<LocationResult?> geocodeAddress(String address) async {
    if (address.trim().isEmpty) return null;

    final encoded = Uri.encodeComponent(address.trim());
    final uri = Uri.parse(
      'https://nominatim.openstreetmap.org/search?q=$encoded&format=json&limit=1',
    );

    final response = await http.get(
      uri,
      headers: {'User-Agent': 'TerritoryManager/1.0'},
    );

    if (response.statusCode != 200) return null;

    final list = jsonDecode(response.body) as List<dynamic>;
    if (list.isEmpty) return null;

    final first = list.first as Map<String, dynamic>;
    final lat = double.tryParse(first['lat']?.toString() ?? '');
    final lon = double.tryParse(first['lon']?.toString() ?? '');
    final displayName = first['display_name'] as String?;

    if (lat == null || lon == null) return null;

    return LocationResult(
      latitude: lat,
      longitude: lon,
      address: displayName,
    );
  }

  /// Searches for address suggestions. Returns list of results to select from.
  /// Use [searchAddress] for autocomplete, then call [geocodeAddress] on selection
  /// or use the lat/lon from the result directly.
  Future<List<LocationResult>> searchAddressSuggestions(String query) async {
    if (query.trim().length < 3) return [];

    final encoded = Uri.encodeComponent(query.trim());
    final uri = Uri.parse(
      'https://nominatim.openstreetmap.org/search?q=$encoded&format=json&limit=5&addressdetails=0',
    );

    final response = await http.get(
      uri,
      headers: {'User-Agent': 'TerritoryManager/1.0'},
    );

    if (response.statusCode != 200) return [];

    final list = jsonDecode(response.body) as List<dynamic>;
    final results = <LocationResult>[];
    for (final item in list) {
      final map = item as Map<String, dynamic>;
      final lat = double.tryParse(map['lat']?.toString() ?? '');
      final lon = double.tryParse(map['lon']?.toString() ?? '');
      final displayName = map['display_name'] as String?;
      if (lat != null && lon != null) {
        results.add(LocationResult(
          latitude: lat,
          longitude: lon,
          address: displayName,
        ));
      }
    }
    return results;
  }
}

class LocationPickerException implements Exception {
  LocationPickerException(this.message);
  final String message;
}
