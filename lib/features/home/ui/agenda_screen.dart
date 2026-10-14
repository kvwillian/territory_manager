import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../admin/ui/assignments_screen.dart';
import '../../auth/providers/auth_provider.dart';
import '../../conductor/ui/home_screen.dart';

/// Agenda tab. Admins see weekly assignments. Others see the field calendar.
class AgendaScreen extends ConsumerWidget {
  const AgendaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    if (auth is AuthAuthenticated && auth.user.isAdmin) {
      return const AssignmentsScreen();
    }
    return const HomeScreen();
  }
}
