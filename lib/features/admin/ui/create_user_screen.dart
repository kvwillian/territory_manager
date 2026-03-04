import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../../../core/providers/create_user_provider.dart';
import '../../auth/models/user_model.dart';
import '../data/mock_user_repository.dart';
import '../providers/users_provider.dart';
import 'admin_shell.dart';
import '../../../../shared/widgets/app_card.dart';

/// Create user screen.
/// When using Firebase: creates Auth + Firestore user via Cloud Function.
/// In demo mode: creates mock user only.
class CreateUserScreen extends ConsumerStatefulWidget {
  const CreateUserScreen({super.key});

  @override
  ConsumerState<CreateUserScreen> createState() => _CreateUserScreenState();
}

class _CreateUserScreenState extends ConsumerState<CreateUserScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  UserRole _role = UserRole.conductor;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final useCloudFunction = ref.read(useCloudFunctionForCreateUserProvider);

      if (useCloudFunction) {
        final service = ref.read(createUserServiceProvider);
        await service.createUser(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
          password: _passwordController.text,
          role: _role,
        );
      } else {
        final repo = ref.read(userRepositoryProvider);
        await repo.createUser(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
          role: _role,
        );
      }

      ref.invalidate(usersProvider);
      if (mounted) {
        context.go('/admin/users');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Usuário criado'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } on FirebaseFunctionsException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.message ?? 'Erro ao criar usuário'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final useCloudFunction = ref.watch(useCloudFunctionForCreateUserProvider);

    return AdminShell(
      title: 'Novo Usuário',
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        labelText: 'Nome',
                      ),
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Obrigatório' : null,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'E-mail',
                        hintText: 'email@exemplo.com',
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Obrigatório';
                        if (!v.contains('@')) return 'E-mail inválido';
                        return null;
                      },
                    ),
                    if (useCloudFunction) ...[
                      const SizedBox(height: AppSpacing.md),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Senha',
                          hintText: 'Mínimo 6 caracteres',
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Obrigatório';
                          if (v.length < 6) return 'Mínimo 6 caracteres';
                          return null;
                        },
                      ),
                    ],
                    const SizedBox(height: AppSpacing.md),
                    DropdownButtonFormField<UserRole>(
                      // ignore: deprecated_member_use
                      value: _role,
                      decoration: const InputDecoration(
                        labelText: 'Função',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: UserRole.admin,
                          child: Text('Administrador'),
                        ),
                        DropdownMenuItem(
                          value: UserRole.conductor,
                          child: Text('Condutor'),
                        ),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _role = v);
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _isLoading ? null : _save,
                child: _isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Criar usuário'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
