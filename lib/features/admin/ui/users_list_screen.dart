import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../auth/models/user_model.dart';
import 'admin_shell.dart';
import '../providers/users_provider.dart';
import '../data/mock_user_repository.dart';
import '../../../../shared/widgets/app_card.dart';

/// Admin users list screen.
class UsersListScreen extends ConsumerWidget {
  const UsersListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncUsers = ref.watch(usersProvider);

    return asyncUsers.when(
      loading: () => AdminShell(
        title: 'Usuários',
        child: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => AdminShell(
        title: 'Usuários',
        child: Center(child: Text('Erro: $e')),
      ),
      data: (users) => AdminShell(
        title: 'Usuários',
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                itemCount: users.length,
                itemBuilder: (context, index) {
                  final user = users[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: _UserCard(
                      user: user,
                      onDelete: () => _deleteUser(context, ref, user),
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => context.push('/admin/users/create'),
                  icon: const Icon(Icons.add),
                  label: const Text('Criar usuário'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteUser(
    BuildContext context,
    WidgetRef ref,
    UserModel user,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Excluir usuário?'),
        content: Text('Excluir ${user.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final repo = ref.read(userRepositoryProvider);
      await repo.deleteUser(user.id);
      ref.invalidate(usersProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Usuário excluído'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}

class _UserCard extends StatelessWidget {
  const _UserCard({
    required this.user,
    required this.onDelete,
  });

  final UserModel user;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            child: Text(
              user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.name,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                Text(
                  user.role == UserRole.admin ? 'Administrador' : 'Condutor',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}
