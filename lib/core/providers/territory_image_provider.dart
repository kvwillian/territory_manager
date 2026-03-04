import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/territory_image_service.dart';
import '../../features/admin/providers/territories_provider.dart';

final territoryImageServiceProvider =
    Provider<TerritoryImageService>((ref) => TerritoryImageService());

/// Listens to territories and prefetches image URLs when they load.
/// Must be mounted when territories are used (e.g. in AppShell).
/// Prefetch runs asynchronously and does not block UI.
class TerritoryImagePrefetcher extends ConsumerWidget {
  const TerritoryImagePrefetcher({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen(territoriesProvider, (prev, next) {
      next.whenOrNull(
        data: (territories) {
          final urls = territories
            .map((t) => t.imageUrl)
            .whereType<String>()
            .where((u) => u.trim().isNotEmpty);
          if (urls.isNotEmpty) {
            ref.read(territoryImageServiceProvider).preloadImageUrls(urls);
          }
        },
      );
    });
    return child;
  }
}
