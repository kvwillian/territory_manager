import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../auth/models/access_flags.dart';
import '../../auth/providers/auth_provider.dart';

class AppMenuScreen extends ConsumerWidget {
  const AppMenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    if (auth is! AuthAuthenticated) {
      return const SizedBox.shrink();
    }
    final user = auth.user;
    final items = <_MenuItem>[
      if (user.canAccess(AccessFlags.publishers))
        const _MenuItem(Icons.people_outline, 'Publicadores', '/publishers'),
      ...user.isAdmin ? _adminItems : _conductorItems,
    ];

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        Text(user.name, style: Theme.of(context).textTheme.headlineMedium),
        Text(
          user.isAdmin ? 'Administrador' : 'Condutor',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.lg),
        ...items.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: ListTile(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: AppColors.border),
              ),
              tileColor: AppColors.cardBackground,
              leading: Icon(item.icon, color: AppColors.vibrantIndigo),
              title: Text(item.label),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push(item.path),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        ListTile(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          leading: const Icon(Icons.logout, color: AppColors.secondaryText),
          title: const Text('Sair'),
          onTap: () => ref.read(authStateProvider.notifier).signOut(),
        ),
      ],
    );
  }
}

class _MenuItem {
  const _MenuItem(this.icon, this.label, this.path);
  final IconData icon;
  final String label;
  final String path;
}

const _adminItems = [
  _MenuItem(Icons.campaign_outlined, 'Avisos', '/announcements'),
  _MenuItem(Icons.event_outlined, 'Horários das reuniões', '/congregation'),
  _MenuItem(Icons.location_city_outlined, 'Bairros', '/admin/bairros'),
  _MenuItem(Icons.place_outlined, 'Locais de saída', '/admin/meeting-locations'),
  _MenuItem(Icons.groups_outlined, 'Grupos de campo', '/admin/field-groups'),
  _MenuItem(Icons.person_outline, 'Usuários', '/admin/users'),
  _MenuItem(Icons.history, 'Histórico', '/admin/history'),
];

const _conductorItems = [
  _MenuItem(Icons.campaign_outlined, 'Avisos', '/announcements'),
  _MenuItem(Icons.event_outlined, 'Horários das reuniões', '/congregation'),
  _MenuItem(Icons.history, 'Histórico', '/history'),
];
