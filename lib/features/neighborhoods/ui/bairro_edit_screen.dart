import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../models/neighborhood_model.dart';
import '../providers/neighborhood_repository_provider.dart';
import '../providers/neighborhoods_provider.dart';
import '../../admin/ui/admin_shell.dart';

/// Edit neighborhood (bairro) screen.
class BairroEditScreen extends ConsumerStatefulWidget {
  const BairroEditScreen({
    super.key,
    required this.neighborhoodId,
  });

  final String neighborhoodId;

  @override
  ConsumerState<BairroEditScreen> createState() => _BairroEditScreenState();
}

class _BairroEditScreenState extends ConsumerState<BairroEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  NeighborhoodModel? _neighborhood;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadNeighborhood());
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _loadNeighborhood() async {
    final repo = ref.read(neighborhoodRepositoryProvider);
    final n = await repo.getNeighborhoodById(widget.neighborhoodId);
    if (n != null && mounted) {
      setState(() {
        _neighborhood = n;
        _nameController.text = n.name;
        _loading = false;
      });
    } else if (mounted) {
      setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_neighborhood == null || !_formKey.currentState!.validate()) return;

    final repo = ref.read(neighborhoodRepositoryProvider);
    final updated = _neighborhood!.copyWith(
      name: _nameController.text.trim(),
    );

    await repo.updateNeighborhood(updated);
    ref.invalidate(neighborhoodsProvider);
    if (mounted) {
      context.go('/admin/bairros');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bairro atualizado'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _delete() async {
    if (_neighborhood == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir bairro?'),
        content: Text(
          'Tem certeza que deseja excluir "${_neighborhood!.name}"?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final repo = ref.read(neighborhoodRepositoryProvider);
    await repo.deleteNeighborhood(_neighborhood!.id);
    ref.invalidate(neighborhoodsProvider);
    if (mounted) {
      context.go('/admin/bairros');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bairro excluído'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return AdminShell(
        title: 'Editar Bairro',
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_neighborhood == null) {
      return AdminShell(
        title: 'Editar Bairro',
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: AppSpacing.md),
              const Text('Bairro não encontrado'),
              const SizedBox(height: AppSpacing.md),
              TextButton(
                onPressed: () => context.go('/admin/bairros'),
                child: const Text('Voltar'),
              ),
            ],
          ),
        ),
      );
    }

    return AdminShell(
      title: 'Editar Bairro',
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppCard(
                child: TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Nome',
                    hintText: 'Ex: Centro, Jardim Norte',
                  ),
                  validator: (v) =>
                      v == null || v.isEmpty ? 'Obrigatório' : null,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _save,
                child: const Text('Salvar alterações'),
              ),
              const SizedBox(height: AppSpacing.md),
              OutlinedButton(
                onPressed: _delete,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.error,
                  side: BorderSide(
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
                child: const Text('Excluir bairro'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
