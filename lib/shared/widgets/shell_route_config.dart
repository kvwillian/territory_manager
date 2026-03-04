import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/shell_config_provider.dart';

/// Wraps a route's child and sets the shell config (title, optional FAB).
/// Use for conductor screens that don't use AdminShell.
class ShellRouteConfig extends ConsumerWidget {
  const ShellRouteConfig({
    super.key,
    required this.title,
    this.fab,
    required this.child,
  });

  final String title;
  final Widget? fab;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(shellConfigProvider.notifier).setConfig(ShellConfig(
        title: title,
        fab: fab,
      ));
    });
    return child;
  }
}
