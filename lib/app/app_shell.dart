import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'dart:async';

import '../core/constants/app_colors.dart';
import '../core/providers/territory_image_provider.dart';
import '../shared/widgets/sync_status_chip.dart';
import '../features/admin/providers/assignments_provider.dart';
import '../features/admin/providers/territories_provider.dart';
import '../features/meetings/providers/meeting_location_repository_provider.dart';
import '../core/services/connectivity_service.dart';
import '../core/services/offline_sync_service.dart';
import '../features/auth/providers/auth_provider.dart';
import '../shared/providers/shell_config_provider.dart';

/// Shared layout for signed-in screens, with the bottom navigation.
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
    if (location == '/home' || location == '/admin') return 'Minha congregação';
    if (location == '/agenda') return 'Agenda';
    if (location == '/mapas') return 'Mapas';
    if (location == '/menu') return 'Menu';
    if (location == '/field') return 'Territórios';
    if (location == '/announcements') return 'Avisos';
    if (location == '/announcements/create') return 'Novo aviso';
    if (location == '/history') return 'Histórico';
    if (location == '/congregation') return 'Reuniões';
    if (location.startsWith('/territory/')) return 'Território';
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
    if (location == '/admin/field-groups') return 'Grupos de campo';
    if (location.startsWith('/admin/field-groups/edit/')) return 'Editar grupo';
    if (location.startsWith('/admin/field-groups/create')) return 'Novo grupo';
    if (location == '/admin/assignments') return 'Designações';
    if (location == '/admin/history') return 'Histórico';
    return 'Gerenciador de Territórios';
  }

  /// Returns the FAB for the current route. Null = no FAB.
  /// Keeps FAB scoped to the correct screens (territories, meeting locations, bairros).
  Widget? _fabForLocation(String location) {
    if (location == '/admin/territories') {
      return FloatingActionButton.extended(
        onPressed: () => context.push('/admin/territories/create'),
        icon: const Icon(Icons.add),
        label: const Text('Novo territÃ³rio'),
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
    if (location == '/admin/field-groups') {
      return FloatingActionButton.extended(
        onPressed: () => context.push('/admin/field-groups/create'),
        icon: const Icon(Icons.add),
        label: const Text('Novo grupo'),
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
          appBar: _isRootTab(location)
              ? null
              : AppBar(
                  title: Text(title),
                  automaticallyImplyLeading: false,
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: () {
                      if (router.canPop()) {
                        router.pop();
                      } else {
                        router.go(user.isAdmin ? '/admin' : '/home');
                      }
                    },
                  ),
                  actions: const [
                    SyncStatusChip(),
                  ],
                ),
          body: TerritoryImagePrefetcher(child: widget.child),
          floatingActionButton: fab,
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tabIndex(location),
            indicatorColor: AppColors.secondaryPurple,
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            onDestinationSelected: (index) {
              final path = switch (index) {
                0 => user.isAdmin ? '/admin' : '/home',
                1 => '/agenda',
                2 => '/mapas',
                _ => '/menu',
              };
              router.go(path);
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'InÃ­cio',
              ),
              NavigationDestination(
                icon: Icon(Icons.calendar_month_outlined),
                selectedIcon: Icon(Icons.calendar_month),
                label: 'Agenda',
              ),
              NavigationDestination(
                icon: Icon(Icons.map_outlined),
                selectedIcon: Icon(Icons.map),
                label: 'Mapas',
              ),
              NavigationDestination(
                icon: Icon(Icons.menu),
                selectedIcon: Icon(Icons.menu),
                label: 'Menu',
              ),
            ],
          ),
        );
      },
    );
  }

  bool _isRootTab(String location) {
    return location == '/home' ||
        location == '/admin' ||
        location == '/agenda' ||
        location == '/mapas' ||
        location == '/menu';
  }

  int _tabIndex(String location) {
    if (location == '/agenda' || location.startsWith('/admin/assignments')) {
      return 1;
    }
    if (location == '/mapas' ||
        location == '/field' ||
        location.startsWith('/admin/territories')) {
      return 2;
    }
    if (location == '/menu' ||
        location.startsWith('/admin/') ||
        location == '/announcements' ||
        location.startsWith('/announcements/') ||
        location == '/congregation' ||
        location == '/history') {
      return 3;
    }
    return 0;
  }
}
