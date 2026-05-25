import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../models/field_group_model.dart';
import '../providers/field_group_repository_provider.dart';
import '../../admin/ui/admin_shell.dart';

/// Edit field group.
class FieldGroupEditScreen extends ConsumerStatefulWidget {
  const FieldGroupEditScreen({super.key, required this.groupId});

  final String groupId;

  @override
  ConsumerState<FieldGroupEditScreen> createState() =>
      _FieldGroupEditScreenState();
}

class _FieldGroupEditScreenState extends ConsumerState<FieldGroupEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  FieldGroupModel? _loaded;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repo = ref.read(fieldGroupRepositoryProvider);
    final g = await repo.getFieldGroupById(widget.groupId);
    if (!mounted) return;
    setState(() {
      _loaded = g;
      _loading = false;
      if (g != null) _nameController.text = g.name;
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final g = _loaded;
    if (g == null) return;

    final repo = ref.read(fieldGroupRepositoryProvider);
    await repo.updateFieldGroup(
      g.copyWith(name: _nameController.text.trim()),
    );
    ref.invalidate(fieldGroupsProvider);
    if (mounted) {
      context.go('/admin/field-groups');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Grupo atualizado'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Excluir grupo?'),
        content: const Text('Esta ação não pode ser desfeita.'),
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
    if (ok != true || !mounted) return;

    final repo = ref.read(fieldGroupRepositoryProvider);
    await repo.deleteFieldGroup(widget.groupId);
    ref.invalidate(fieldGroupsProvider);
    if (mounted) {
      context.go('/admin/field-groups');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Grupo excluído'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const AdminShell(
        title: 'Editar grupo',
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_loaded == null) {
      return AdminShell(
        title: 'Editar grupo',
        child: Center(
          child: Text(
            'Grupo não encontrado',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      );
    }

    return AdminShell(
      title: 'Editar grupo',
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
                child: const Text('Salvar'),
              ),
              const SizedBox(height: AppSpacing.md),
              TextButton.icon(
                onPressed: _delete,
                icon: const Icon(Icons.delete_outline),
                label: const Text('Excluir grupo'),
                style: TextButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.error,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
