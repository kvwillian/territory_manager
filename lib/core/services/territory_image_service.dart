import 'dart:async';

import 'package:flutter_cache_manager/flutter_cache_manager.dart';

/// Cache configuration for territory and related images.
/// Supports territory images, meeting location images (future), and territory maps.
///
/// Configuration:
/// - maxNrOfCacheObjects: ~200 (approximates 200 MB at ~1 MB per image)
/// - stalePeriod: 30 days - cached files older than this are revalidated
class TerritoryImageCacheManager {
  TerritoryImageCacheManager._();

  static const String _cacheKey = 'territory_images';

  /// Approximately 200 MB: ~200 images at ~1 MB each.
  /// flutter_cache_manager uses object count, not byte size.
  static const int _maxNrOfCacheObjects = 200;

  /// Cached files older than this are considered stale and may be re-downloaded.
  static const Duration _stalePeriod = Duration(days: 30);

  static final CacheManager instance = CacheManager(
    Config(
      _cacheKey,
      stalePeriod: _stalePeriod,
      maxNrOfCacheObjects: _maxNrOfCacheObjects,
    ),
  );
}

/// Service for preloading and managing cached territory images.
///
/// Responsibilities:
/// - Preload territory images into cache
/// - Manage caching via shared [TerritoryImageCacheManager]
/// - Expose helper methods for loading cached images (via [CachedTerritoryImage] widget)
///
/// Supports offline: cached files are served from disk when network is unavailable.
/// Future support: meeting location images, territory maps, any Firestore image URLs.
class TerritoryImageService {
  TerritoryImageService();

  CacheManager get _cacheManager => TerritoryImageCacheManager.instance;

  /// Preloads a single image URL into cache.
  /// Does not block; runs asynchronously.
  Future<void> preloadImage(String url) async {
    if (url.trim().isEmpty) return;
    try {
      await _cacheManager.downloadFile(url);
    } catch (_) {
      // Ignore download errors; image will load on demand
    }
  }

  /// Preloads multiple image URLs into cache.
  /// Runs asynchronously and must not block UI rendering.
  /// Duplicate URLs are deduplicated.
  Future<void> preloadImageUrls(Iterable<String?> urls) async {
    final unique = urls
        .whereType<String>()
        .map((u) => u.trim())
        .where((u) => u.isNotEmpty)
        .toSet();
    for (final url in unique) {
      unawaited(preloadImage(url));
    }
  }

  /// Clears all cached images. Use sparingly (e.g. for debugging).
  Future<void> clearCache() async {
    await _cacheManager.emptyCache();
  }
}
