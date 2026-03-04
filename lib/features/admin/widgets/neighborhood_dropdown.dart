import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../neighborhoods/providers/neighborhoods_provider.dart';

/// Dropdown to select a neighborhood (bairro).
class NeighborhoodDropdown extends ConsumerWidget {
  const NeighborhoodDropdown({
    super.key,
    required this.selectedId,
    required this.onChanged,
  });

  final String? selectedId;
  final void Function(String?) onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(neighborhoodsProvider);
    return async.when(
      loading: () => const InputDecorator(
        decoration: InputDecoration(labelText: 'Bairro'),
        child: SizedBox(height: 24, child: LinearProgressIndicator()),
      ),
      error: (e, _) => InputDecorator(
        decoration: const InputDecoration(labelText: 'Bairro'),
        child: Text('Erro: $e'),
      ),
      data: (neighborhoods) {
        if (neighborhoods.isEmpty) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const InputDecorator(
                decoration: InputDecoration(labelText: 'Bairro'),
                child: Text('Nenhum bairro cadastrado'),
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: () => context.push('/admin/bairros/create'),
                icon: const Icon(Icons.add),
                label: const Text('Cadastrar bairros'),
              ),
            ],
          );
        }
        return InputDecorator(
          decoration: const InputDecoration(
            labelText: 'Bairro',
            hintText: 'Selecione um bairro',
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: selectedId,
              isExpanded: true,
              hint: const Text('Selecione um bairro'),
              items: [
                const DropdownMenuItem(value: null, child: Text('Selecione...')),
                ...neighborhoods.map(
                  (n) => DropdownMenuItem(value: n.id, child: Text(n.name)),
                ),
              ],
              onChanged: onChanged,
            ),
          ),
        );
      },
    );
  }
}
