import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Configuration for the global app shell (title, FAB).
/// Child screens set this in their build to customize the shell.
class ShellConfig {
  const ShellConfig({
    required this.title,
    this.fab,
  });

  final String title;
  final Widget? fab;
}

class ShellConfigNotifier extends Notifier<ShellConfig> {
  @override
  ShellConfig build() => const ShellConfig(title: '');

  void setConfig(ShellConfig config) => state = config;
}

final shellConfigProvider =
    NotifierProvider<ShellConfigNotifier, ShellConfig>(ShellConfigNotifier.new);
