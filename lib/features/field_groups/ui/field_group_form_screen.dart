import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../models/field_group_model.dart';
import '../providers/field_group_repository_provider.dart';
import '../../admin/ui/admin_shell.dart';

/// Create field group.
class FieldGroupFormScreen extends ConsumerStatefulWidget {
  const FieldGroupFormScreen({super.key});

  @override
  ConsumerState<FieldGroupFormScreen> createState() =>
      _FieldGroupFormScreenState();
}

class _FieldGroupFormScreenState extends ConsumerState<FieldGroupFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final repo = ref.read(fieldGroupRepositoryProvider);
    final group = FieldGroupModel(
      id: '',
      name: _nameController.text.trim(),
    );

    await repo.createFieldGroup(group);
    ref.invalidate(fieldGroupsProvider);
    if (mounted) {
      context.go('/admin/field-groups');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Grupo criado'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminShell(
      title: 'Novo grupo',
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
                        labelText: 'Nome do grupo',
                        hintText: 'Ex: Grupo Guaíba',
                      ),
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Obrigatório' : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _save,
                child: const Text('Criar grupo'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
