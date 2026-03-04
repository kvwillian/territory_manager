import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../models/neighborhood_model.dart';
import '../providers/neighborhood_repository_provider.dart';
import '../providers/neighborhoods_provider.dart';
import '../../admin/ui/admin_shell.dart';

/// Create neighborhood (bairro) screen.
class BairroFormScreen extends ConsumerStatefulWidget {
  const BairroFormScreen({super.key});

  @override
  ConsumerState<BairroFormScreen> createState() => _BairroFormScreenState();
}

class _BairroFormScreenState extends ConsumerState<BairroFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final repo = ref.read(neighborhoodRepositoryProvider);
    final neighborhood = NeighborhoodModel(
      id: '',
      name: _nameController.text.trim(),
    );

    await repo.createNeighborhood(neighborhood);
    ref.invalidate(neighborhoodsProvider);
    if (mounted) {
      context.go('/admin/bairros');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bairro criado'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminShell(
      title: 'Novo Bairro',
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
                        hintText: 'Ex: Centro, Jardim Norte',
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
                child: const Text('Criar bairro'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
