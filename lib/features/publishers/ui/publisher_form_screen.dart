import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../models/publisher_model.dart';
import '../providers/publisher_repository_provider.dart';

class PublisherFormScreen extends ConsumerStatefulWidget {
  const PublisherFormScreen({super.key, this.publisherId});

  final String? publisherId;

  @override
  ConsumerState<PublisherFormScreen> createState() =>
      _PublisherFormScreenState();
}

class _PublisherFormScreenState extends ConsumerState<PublisherFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  CongregationPrivilege _privilege = CongregationPrivilege.publisher;
  PioneerService _pioneer = PioneerService.none;
  bool _indicador = false;
  bool _microfone = false;
  bool _som = false;
  bool _loading = false;
  bool _ready = false;

  bool get _isEdit => widget.publisherId != null;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _load(PublisherModel publisher) {
    if (_ready) return;
    _nameController.text = publisher.name;
    _privilege = publisher.privilege;
    _pioneer = publisher.pioneer;
    _indicador = publisher.indicador;
    _microfone = publisher.microfone;
    _som = publisher.som;
    _ready = true;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final repo = ref.read(publisherRepositoryProvider);
    final publisher = PublisherModel(
      id: widget.publisherId ?? '',
      name: _nameController.text.trim(),
      privilege: _privilege,
      pioneer: _pioneer,
      indicador: _indicador,
      microfone: _microfone,
      som: _som,
    );
    try {
      if (_isEdit) {
        await repo.updatePublisher(publisher);
      } else {
        await repo.createPublisher(publisher);
      }
      ref.invalidate(publishersProvider);
      if (mounted) context.pop();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isEdit) {
      final existing = ref.watch(publishersProvider);
      final match = existing.maybeWhen(
        data: (items) {
          for (final item in items) {
            if (item.id == widget.publisherId) return item;
          }
          return null;
        },
        orElse: () => null,
      );
      if (existing.isLoading) {
        return const Center(child: CircularProgressIndicator());
      }
      if (match == null) {
        return const Center(child: Text('Publicador não encontrado'));
      }
      _load(match);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppCard(
              child: Column(
                children: [
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Nome'),
                    textCapitalization: TextCapitalization.words,
                    validator: (value) => value == null || value.trim().isEmpty
                        ? 'Obrigatório'
                        : null,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<CongregationPrivilege>(
                    initialValue: _privilege,
                    decoration: const InputDecoration(labelText: 'Privilégio'),
                    items: [
                      for (final privilege in CongregationPrivilege.values)
                        DropdownMenuItem(
                          value: privilege,
                          child: Text(privilegeLabels[privilege]!),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) setState(() => _privilege = value);
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<PioneerService>(
                    initialValue: _pioneer,
                    decoration: const InputDecoration(
                      labelText: 'Serviço de pioneiro',
                    ),
                    items: [
                      for (final pioneer in PioneerService.values)
                        DropdownMenuItem(
                          value: pioneer,
                          child: Text(pioneerLabels[pioneer]!),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) setState(() => _pioneer = value);
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Indicador'),
                    value: _indicador,
                    onChanged: (value) => setState(() => _indicador = value ?? false),
                  ),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Microfone'),
                    subtitle: const Text('Pode ser designado no volante'),
                    value: _microfone,
                    onChanged: (value) => setState(() => _microfone = value ?? false),
                  ),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Som'),
                    subtitle: const Text('Pode ser designado no volante e na mesa de som'),
                    value: _som,
                    onChanged: (value) => setState(() => _som = value ?? false),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            FilledButton(
              onPressed: _loading ? null : _save,
              child: _loading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_isEdit ? 'Salvar' : 'Cadastrar'),
            ),
          ],
        ),
      ),
    );
  }
}
