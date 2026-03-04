import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

/// Placeholder for territory image when no image is available.
/// borderRadius: 12 per design system.
class TerritoryImagePlaceholder extends StatelessWidget {
  const TerritoryImagePlaceholder({
    super.key,
    this.width,
    this.height = 120,
  });

  final double? width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.secondaryPurple,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Icon(
        Icons.map_outlined,
        size: 48,
        color: AppColors.primaryPurple.withValues(alpha: 0.5),
      ),
    );
  }
}
