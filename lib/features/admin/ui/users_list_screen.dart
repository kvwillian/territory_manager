import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../../../core/providers/create_user_provider.dart';
import '../../../../core/services/reset_password_service.dart';
import '../../auth/models/user_model.dart';
import '../data/mock_user_repository.dart';
import '../providers/users_provider.dart';
import '../../../../shared/widgets/app_card.dart';
import 'admin_shell.dart';

final _resetPasswordServiceProvider =
    Provider<ResetPasswordService>((ref) => ResetPasswordService());

/// Admin users list screen.
class UsersListScreen extends ConsumerWidget {
  const UsersListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncUsers = ref.watch(usersProvider);
    final useCloudFunction = ref.watch(useCloudFunctionForCreateUserProvider);

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
                      canResetPassword: useCloudFunction,
                      onResetPassword: () =>
                          _showResetPasswordDialog(context, ref, user),
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

  Future<void> _showResetPasswordDialog(
    BuildContext context,
    WidgetRef ref,
    UserModel user,
  ) async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => _ResetPasswordDialog(
        user: user,
        onSuccess: () {
          if (ctx.mounted) Navigator.pop(ctx);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Senha alterada'),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        onError: (message) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(message),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        resetService: ref.read(_resetPasswordServiceProvider),
      ),
    );
  }
}

class _ResetPasswordDialog extends StatefulWidget {
  const _ResetPasswordDialog({
    required this.user,
    required this.onSuccess,
    required this.onError,
    required this.resetService,
  });

  final UserModel user;
  final VoidCallback onSuccess;
  final void Function(String message) onError;
  final ResetPasswordService resetService;

  @override
  State<_ResetPasswordDialog> createState() => _ResetPasswordDialogState();
}

class _ResetPasswordDialogState extends State<_ResetPasswordDialog> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_passwordController.text != _confirmController.text) {
      widget.onError('As senhas não coincidem');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await widget.resetService.resetPassword(
        uid: widget.user.id,
        newPassword: _passwordController.text,
      );
      if (mounted) widget.onSuccess();
    } on FirebaseFunctionsException catch (e) {
      if (mounted) widget.onError(e.message ?? 'Erro ao alterar senha');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Redefinir senha: ${widget.user.name}'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: 'Nova senha',
                  hintText: 'Mínimo 6 caracteres',
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Obrigatório';
                  if (v.length < 6) return 'Mínimo 6 caracteres';
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _confirmController,
                obscureText: _obscureConfirm,
                decoration: InputDecoration(
                  labelText: 'Confirmar senha',
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureConfirm
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                    onPressed: () =>
                        setState(() => _obscureConfirm = !_obscureConfirm),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Obrigatório';
                  if (v != _passwordController.text) return 'As senhas não coincidem';
                  return null;
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _isLoading ? null : _submit,
          child: _isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Alterar senha'),
        ),
      ],
    );
  }
}

class _UserCard extends StatelessWidget {
  const _UserCard({
    required this.user,
    required this.canResetPassword,
    required this.onResetPassword,
    required this.onDelete,
  });

  final UserModel user;
  final bool canResetPassword;
  final VoidCallback onResetPassword;
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
          if (canResetPassword)
            IconButton(
              icon: const Icon(Icons.lock_reset),
              onPressed: onResetPassword,
              tooltip: 'Redefinir senha',
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
