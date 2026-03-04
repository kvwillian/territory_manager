import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/services/territory_image_service.dart';
import 'territory_image_placeholder.dart';

/// Cached image widget for territory images, meeting location images (future),
/// territory maps, and any Firestore image URLs.
///
/// Uses [TerritoryImageCacheManager] for consistent caching across the app.
/// Serves from cache when available (offline support).
/// Automatically refreshes when cache is stale (30 days).
class CachedTerritoryImage extends StatelessWidget {
  const CachedTerritoryImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height = 120,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  final String? imageUrl;
  final double? width;
  final double height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null || imageUrl!.trim().isEmpty) {
      return TerritoryImagePlaceholder(width: width, height: height);
    }

    final radius = borderRadius ?? BorderRadius.circular(12);

    return ClipRRect(
      borderRadius: radius,
      child: CachedNetworkImage(
        imageUrl: imageUrl!,
        width: width,
        height: height,
        fit: fit,
        cacheManager: TerritoryImageCacheManager.instance,
        placeholder: (context, url) => TerritoryImagePlaceholder(
          width: width,
          height: height,
        ),
        errorWidget: (context, url, error) => TerritoryImagePlaceholder(
          width: width,
          height: height,
        ),
      ),
    );
  }
}
