import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/providers/shell_config_provider.dart';

/// Wrapper for admin screens that sets shell config (title, FAB).
/// The global AppShell provides the drawer and app bar.
class AdminShell extends ConsumerWidget {
  const AdminShell({
    super.key,
    required this.child,
    required this.title,
    this.floatingActionButton,
  });

  final Widget child;
  final String title;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(shellConfigProvider.notifier).setConfig(ShellConfig(
        title: title,
        fab: floatingActionButton,
      ));
    });
    return child;
  }
}
