import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:territory_manager/app/app_shell.dart';
import 'package:territory_manager/features/announcements/ui/announcement_form_screen.dart';
import 'package:territory_manager/features/announcements/ui/announcements_list_screen.dart';
import 'package:territory_manager/features/auth/models/access_flags.dart';
import 'package:territory_manager/features/home/ui/agenda_screen.dart';
import 'package:territory_manager/features/home/ui/app_menu_screen.dart';
import 'package:territory_manager/features/home/ui/congregation_dashboard_screen.dart';
import 'package:territory_manager/features/home/ui/maps_screen.dart';
import 'package:territory_manager/features/home/ui/module_soon_screen.dart';
import 'package:territory_manager/features/admin/ui/assignments_screen.dart';
import 'package:territory_manager/features/admin/ui/create_user_screen.dart';
import 'package:territory_manager/features/admin/ui/history_screen.dart';
import 'package:territory_manager/features/admin/ui/territories_list_screen.dart';
import 'package:territory_manager/features/admin/ui/territory_edit_screen.dart';
import 'package:territory_manager/features/admin/ui/territory_bulk_import_screen.dart';
import 'package:territory_manager/features/admin/ui/territory_form_screen.dart';
import 'package:territory_manager/features/neighborhoods/ui/bairro_edit_screen.dart';
import 'package:territory_manager/features/neighborhoods/ui/bairro_form_screen.dart';
import 'package:territory_manager/features/neighborhoods/ui/bairros_list_screen.dart';
import 'package:territory_manager/features/admin/ui/users_list_screen.dart';
import 'package:territory_manager/features/meetings/ui/meeting_location_edit_screen.dart';
import 'package:territory_manager/features/meetings/ui/meeting_location_form_screen.dart';
import 'package:territory_manager/features/meetings/ui/meeting_locations_list_screen.dart';
import 'package:territory_manager/features/field_groups/ui/field_group_edit_screen.dart';
import 'package:territory_manager/features/field_groups/ui/field_group_form_screen.dart';
import 'package:territory_manager/features/field_groups/ui/field_groups_list_screen.dart';
import 'package:territory_manager/features/auth/providers/auth_provider.dart';
import 'package:territory_manager/features/auth/ui/change_password_screen.dart';
import 'package:territory_manager/features/auth/ui/forgot_password_screen.dart';
import 'package:territory_manager/features/auth/ui/login_screen.dart';
import 'package:territory_manager/features/onboarding/ui/create_account_placeholder_screen.dart';
import 'package:territory_manager/features/onboarding/ui/onboarding_welcome_screen.dart';
import 'package:territory_manager/features/conductor/ui/home_screen.dart';
import 'package:territory_manager/features/conductor/ui/history_screen.dart' as conductor;
import 'package:territory_manager/features/congregations/ui/congregation_schedule_screen.dart';
import 'package:territory_manager/features/conductor/ui/territory_screen.dart';
import 'package:territory_manager/shared/widgets/shell_route_config.dart';

/// Notifier that triggers GoRouter redirect when auth state changes.
/// Using refreshListenable avoids recreating the entire router on auth change,
/// which was causing flickering between loading and dashboard.
class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(Ref ref) {
    ref.listen(authStateProvider, (_, __) => notifyListeners());
  }
}

/// When navigation uses [GoRouter.go], the Navigator stack may not pop.
/// Maps the current shell route to its parent so system back goes up (e.g. Designações → Painel).
String? _parentLocationForBack(String loc) {
  if (loc.startsWith('/territory/')) return '/field';
  if (loc == '/field') return '/home';
  if (loc == '/history') return '/home';
  if (loc == '/congregation') return '/home';
  if (loc.startsWith('/admin/territories/edit/')) return '/admin/territories';
  if (loc == '/admin/territories/create') return '/admin/territories';
  if (loc == '/admin/territories') return '/admin';
  if (loc.startsWith('/admin/bairros/edit/')) return '/admin/bairros';
  if (loc == '/admin/bairros/create') return '/admin/bairros';
  if (loc == '/admin/bairros') return '/admin';
  if (loc.startsWith('/admin/meeting-locations/edit/')) {
    return '/admin/meeting-locations';
  }
  if (loc == '/admin/meeting-locations/create') {
    return '/admin/meeting-locations';
  }
  if (loc == '/admin/meeting-locations') return '/admin';
  if (loc.startsWith('/admin/field-groups/edit/')) {
    return '/admin/field-groups';
  }
  if (loc == '/admin/field-groups/create') return '/admin/field-groups';
  if (loc == '/admin/field-groups') return '/admin';
  if (loc == '/admin/users/create') return '/admin/users';
  if (loc == '/admin/users') return '/admin';
  if (loc == '/admin/territories/import') return '/admin/territories';
  if (loc == '/admin/assignments') return '/admin';
  if (loc == '/admin/history') return '/admin';
  if (loc.startsWith('/admin/')) return '/admin';
  return null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final authRefresh = _AuthRefreshNotifier(ref);

  return GoRouter(
    initialLocation: '/login',
    debugLogDiagnostics: true,
    refreshListenable: authRefresh,
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final loc = state.matchedLocation;
      final isLoggingIn = loc == '/login';
      final isForgotPassword = loc == '/forgot-password';
      final isOnboarding = loc == '/onboarding' || loc.startsWith('/onboarding/');

      if (authState is AuthLoading) {
        return null;
      }

      if (authState is AuthAuthenticated) {
        final user = authState.user;
        if (user.mustChangePassword && loc != '/change-password') {
          return '/change-password';
        }
        if (!user.mustChangePassword && loc == '/change-password') {
          return user.isAdmin ? '/admin' : '/home';
        }
        if (state.uri.path == '/' || state.uri.path.isEmpty) {
          return user.isAdmin ? '/admin' : '/home';
        }
        if ((loc == '/field' || loc.startsWith('/territory/')) &&
            !user.canAccess(AccessFlags.territories)) {
          return '/home';
        }
        if (loc == '/announcements/create' && !user.isAdmin) {
          return '/announcements';
        }
        if (isLoggingIn || isForgotPassword) {
          return user.isAdmin ? '/admin' : '/home';
        }
        if (loc.startsWith('/admin') && !user.isAdmin) {
          return '/home';
        }
        return null;
      }

      if (authState is AuthUnauthenticated) {
        if (!isLoggingIn && !isForgotPassword && !isOnboarding) {
          return '/login';
        }
        return null;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/change-password',
        builder: (context, state) => const ChangePasswordScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingWelcomeScreen(),
      ),
      GoRoute(
        path: '/onboarding/account',
        builder: (context, state) => const CreateAccountPlaceholderScreen(),
      ),
      GoRoute(
        path: '/',
        redirect: (context, state) {
          // Only redirect when at exactly /, not when at /admin, /home, etc.
          final path = state.uri.path;
          return (path == '/' || path.isEmpty) ? '/home' : null;
        },
        routes: [
          ShellRoute(
            builder: (context, state, child) {
              return PopScope(
                canPop: false,
                onPopInvokedWithResult: (didPop, result) {
                  if (didPop) return;
                  final router = GoRouter.of(context);
                  if (router.canPop()) {
                    router.pop();
                    return;
                  }
                  final parent =
                      _parentLocationForBack(router.state.matchedLocation);
                  if (parent != null) {
                    router.go(parent);
                    return;
                  }
                  SystemNavigator.pop();
                },
                child: AppShell(state: state, child: child),
              );
            },
            routes: [
              GoRoute(
                path: 'home',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Minha congregação',
                  child: CongregationDashboardScreen(),
                ),
              ),
              GoRoute(
                path: 'field',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Territórios',
                  child: HomeScreen(),
                ),
              ),
              GoRoute(
                path: 'agenda',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Agenda',
                  child: AgendaScreen(),
                ),
              ),
              GoRoute(
                path: 'mapas',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Mapas',
                  child: MapsScreen(),
                ),
              ),
              GoRoute(
                path: 'menu',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Menu',
                  child: AppMenuScreen(),
                ),
              ),
              GoRoute(
                path: 'territory/:id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return ShellRouteConfig(
                    title: 'Território',
                    child: TerritoryScreen(territoryId: id),
                  );
                },
              ),
              GoRoute(
                path: 'history',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Histórico',
                  child: conductor.ConductorHistoryScreen(),
                ),
              ),
              GoRoute(
                path: 'congregation',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Reuniões',
                  child: CongregationScheduleScreen(),
                ),
              ),
              GoRoute(
                path: 'admin',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Minha congregação',
                  child: CongregationDashboardScreen(),
                ),
                routes: [
                  GoRoute(
                    path: 'bairros',
                    builder: (context, state) => const BairrosListScreen(),
                    routes: [
                      GoRoute(
                        path: 'create',
                        builder: (context, state) => const BairroFormScreen(),
                      ),
                      GoRoute(
                        path: 'edit/:id',
                        builder: (context, state) {
                          final id = state.pathParameters['id']!;
                          return BairroEditScreen(neighborhoodId: id);
                        },
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'meeting-locations',
                    builder: (context, state) =>
                        const MeetingLocationsListScreen(),
                    routes: [
                      GoRoute(
                        path: 'create',
                        builder: (context, state) =>
                            const MeetingLocationFormScreen(),
                      ),
                      GoRoute(
                        path: 'edit/:id',
                        builder: (context, state) {
                          final id = state.pathParameters['id']!;
                          return MeetingLocationEditScreen(locationId: id);
                        },
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'field-groups',
                    builder: (context, state) => const FieldGroupsListScreen(),
                    routes: [
                      GoRoute(
                        path: 'create',
                        builder: (context, state) =>
                            const FieldGroupFormScreen(),
                      ),
                      GoRoute(
                        path: 'edit/:id',
                        builder: (context, state) {
                          final id = state.pathParameters['id']!;
                          return FieldGroupEditScreen(groupId: id);
                        },
                      ),
                    ],
                  ),
                ],
              ),
              GoRoute(
                path: 'admin/territories',
                builder: (context, state) => const TerritoriesListScreen(),
              ),
              GoRoute(
                path: 'admin/territories/create',
                builder: (context, state) => const CreateTerritoryScreen(),
              ),
              GoRoute(
                path: 'admin/territories/import',
                builder: (context, state) => const TerritoryBulkImportScreen(),
              ),
              GoRoute(
                path: 'admin/territories/edit/:id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return EditTerritoryScreen(territoryId: id);
                },
              ),
              GoRoute(
                path: 'admin/users',
                builder: (context, state) => const UsersListScreen(),
              ),
              GoRoute(
                path: 'admin/users/create',
                builder: (context, state) => const CreateUserScreen(),
              ),
              GoRoute(
                path: 'admin/assignments',
                builder: (context, state) => const AssignmentsScreen(),
              ),
              GoRoute(
                path: 'admin/history',
                builder: (context, state) => const HistoryScreen(),
              ),
              GoRoute(
                path: 'announcements',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Avisos',
                  child: AnnouncementsListScreen(),
                ),
              ),
              GoRoute(
                path: 'announcements/create',
                builder: (context, state) => const ShellRouteConfig(
                  title: 'Novo aviso',
                  child: AnnouncementFormScreen(),
                ),
              ),
              GoRoute(
                path: 'module/:name',
                builder: (context, state) {
                  final name = state.pathParameters['name'] ?? '';
                  final title = name == 'publicadores'
                      ? 'Publicadores'
                      : 'Relatórios';
                  return ShellRouteConfig(
                    title: title,
                    child: ModuleSoonScreen(title: title),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
