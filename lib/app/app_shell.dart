import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'dart:async';

import '../core/constants/app_colors.dart';
import '../core/constants/app_spacing.dart';
import '../core/providers/territory_image_provider.dart';
import '../shared/widgets/sync_status_chip.dart';
import '../features/admin/providers/assignments_provider.dart';
import '../features/admin/providers/territories_provider.dart';
import '../features/meetings/providers/meeting_location_repository_provider.dart';
import '../core/services/connectivity_service.dart';
import '../core/services/offline_sync_service.dart';
import '../features/auth/models/user_model.dart';
import '../features/auth/providers/auth_provider.dart';
import '../shared/providers/shell_config_provider.dart';

/// Global layout wrapper with navigation drawer.
/// Shared across all main authenticated screens.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({
    super.key,
    required this.child,
    required this.state,
  });

  final Widget child;
  final GoRouterState state;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  StreamSubscription? _connectivitySubscription;
  Timer? _periodicRefreshTimer;
  bool _syncStarted = false;

  @override
  void initState() {
    super.initState();
    _connectivitySubscription =
        ConnectivityService().onConnectivityChanged.listen((online) {
      if (online) {
        final sync = ref.read(offlineSyncServiceProvider);
        if (!sync.isSyncing) {
          sync.processSyncQueue();
        }
      }
    });
    _periodicRefreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => ref.read(offlineSyncServiceProvider).maybePeriodicRefresh(),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_syncStarted) {
        _syncStarted = true;
        ref.read(offlineSyncServiceProvider).performInitialSync();
      }
    });
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    _periodicRefreshTimer?.cancel();
    super.dispose();
  }

  String _titleForLocation(String location) {
    if (location == '/home') return 'Início';
    if (location == '/history') return 'Histórico';
    if (location.startsWith('/territory/')) return 'Território';
    if (location == '/admin') return 'Painel';
    if (location == '/admin/territories') return 'Territórios';
    if (location.startsWith('/admin/territories/create')) return 'Novo Território';
    if (location.startsWith('/admin/territories/edit/')) return 'Editar Território';
    if (location == '/admin/bairros') return 'Bairros';
    if (location.startsWith('/admin/bairros/create')) return 'Novo Bairro';
    if (location.startsWith('/admin/bairros/edit/')) return 'Editar Bairro';
    if (location == '/admin/users') return 'Usuários';
    if (location.startsWith('/admin/users/create')) return 'Novo Usuário';
    if (location == '/admin/meeting-locations') return 'Locais de Saída';
    if (location.startsWith('/admin/meeting-locations/create')) return 'Novo Local';
    if (location.startsWith('/admin/meeting-locations/edit/')) return 'Editar Local';
    if (location == '/admin/assignments') return 'Designações';
    if (location == '/admin/history') return 'Histórico';
    return 'Gerenciador de Territórios';
  }

  /// Returns the FAB for the current route. Null = no FAB.
  /// Keeps FAB scoped to the correct screens (territories, meeting locations, bairros).
  Widget? _fabForLocation(String location) {
    if (location == '/admin' || location == '/admin/territories') {
      return FloatingActionButton.extended(
        onPressed: () => context.push('/admin/territories/create'),
        icon: const Icon(Icons.add),
        label: const Text('Novo território'),
      );
    }
    if (location == '/admin/meeting-locations') {
      return FloatingActionButton.extended(
        onPressed: () => context.push('/admin/meeting-locations/create'),
        icon: const Icon(Icons.add),
        label: const Text('Novo local'),
      );
    }
    if (location == '/admin/bairros') {
      return FloatingActionButton.extended(
        onPressed: () => context.push('/admin/bairros/create'),
        icon: const Icon(Icons.add),
        label: const Text('Novo bairro'),
      );
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final config = ref.watch(shellConfigProvider);
    ref.watch(territoriesInvalidateSetupProvider);
    ref.watch(meetingLocationsInvalidateSetupProvider);
    ref.watch(assignmentsInvalidateSetupProvider);
    final router = GoRouter.of(context);
    // Listen to router so FAB updates when route changes (fixes stale FAB on nav)
    return ListenableBuilder(
      listenable: router.routerDelegate,
      builder: (context, _) {
        final location =
            router.routerDelegate.state.matchedLocation;
        final title = config.title.isNotEmpty
            ? config.title
            : _titleForLocation(location);
        final fab = _fabForLocation(location);

        if (authState is! AuthAuthenticated) {
          return widget.child;
        }

        final user = authState.user;

        return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        actions: const [
          SyncStatusChip(),
        ],
      ),
      drawer: _AppDrawer(
        user: user,
        currentLocation: location,
        scaffoldContext: context,
        router: GoRouter.of(context),
        onSignOut: () => ref.read(authStateProvider.notifier).signOut(),
      ),
      body: TerritoryImagePrefetcher(child: widget.child),
      floatingActionButton: fab,
        );
      },
    );
  }
}

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({
    required this.user,
    required this.currentLocation,
    required this.scaffoldContext,
    required this.router,
    required this.onSignOut,
  });

  final UserModel user;
  final String currentLocation;
  final BuildContext scaffoldContext;
  final GoRouter router;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    final isAdmin = user.isAdmin;
    final items = isAdmin ? _adminItems : _conductorItems;

    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _DrawerHeader(user: user),
            const SizedBox(height: AppSpacing.md),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                children: [
                  ...items.map(
                    (item) => _DrawerTile(
                      icon: item.icon,
                      label: item.label,
                      path: item.path,
                      isSelected: _isSelected(currentLocation, item.path),
                      onTap: () {
                        Navigator.of(scaffoldContext).pop();
                        router.go(item.path);
                      },
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: Icon(
                Icons.logout,
                color: AppColors.secondaryText,
                size: 24,
              ),
              title: Text(
                'Sair',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.secondaryText,
                    ),
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              onTap: () {
                Navigator.of(scaffoldContext).pop();
                onSignOut();
              },
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ),
      ),
    );
  }

  bool _isSelected(String location, String path) {
    if (path == '/admin') return location == '/admin';
    if (path == '/home') return location == '/home';
    if (path == '/history') return location == '/history';
    return location.startsWith(path);
  }
}

const _adminItems = [
  _DrawerItem(icon: Icons.dashboard_outlined, label: 'Painel', path: '/admin'),
  _DrawerItem(icon: Icons.map_outlined, label: 'Territórios', path: '/admin/territories'),
  _DrawerItem(icon: Icons.location_city_outlined, label: 'Bairros', path: '/admin/bairros'),
  _DrawerItem(icon: Icons.place_outlined, label: 'Locais de Saída', path: '/admin/meeting-locations'),
  _DrawerItem(icon: Icons.person_outline, label: 'Usuários', path: '/admin/users'),
  _DrawerItem(icon: Icons.assignment_outlined, label: 'Designações semanais', path: '/admin/assignments'),
  _DrawerItem(icon: Icons.history, label: 'Histórico', path: '/admin/history'),
];

const _conductorItems = [
  _DrawerItem(icon: Icons.home_outlined, label: 'Início', path: '/home'),
  _DrawerItem(icon: Icons.history, label: 'Histórico', path: '/history'),
];

class _DrawerItem {
  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.path,
  });
  final IconData icon;
  final String label;
  final String path;
}

class _DrawerHeader extends StatelessWidget {
  const _DrawerHeader({required this.user});

  final UserModel user;

  @override
  Widget build(BuildContext context) {
    final roleLabel = user.isAdmin ? 'Administrador' : 'Condutor';

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.secondaryPurple.withValues(alpha: 0.5),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(16),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: AppColors.primaryPurple.withValues(alpha: 0.2),
            child: Icon(
              user.isAdmin ? Icons.admin_panel_settings : Icons.person,
              size: 32,
              color: AppColors.primaryPurple,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            user.name,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryText,
                ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: AppColors.primaryPurple.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              roleLabel,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.primaryPurple,
                    fontWeight: FontWeight.w500,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  const _DrawerTile({
    required this.icon,
    required this.label,
    required this.path,
    required this.isSelected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String path;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? AppColors.primaryPurple : AppColors.secondaryText,
          size: 24,
        ),
        title: Text(
          label,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: isSelected ? AppColors.primaryPurple : AppColors.primaryText,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        selected: isSelected,
        selectedTileColor: AppColors.secondaryPurple,
        onTap: onTap,
      ),
    );
  }
}
