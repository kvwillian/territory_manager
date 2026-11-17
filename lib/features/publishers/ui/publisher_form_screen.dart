import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../../publisher_groups/providers/publisher_groups_provider.dart';
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
  final _phoneController = TextEditingController();
  final _ageController = TextEditingController();
  CongregationPrivilege _privilege = CongregationPrivilege.publisher;
  PioneerService _pioneer = PioneerService.none;
  String _gender = 'masculino';
  String _status = 'active';
  String? _groupId;
  PublisherModel? _existing;
  bool _loading = false;
  bool _ready = false;

  bool get _isEdit => widget.publisherId != null;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _ageController.dispose();
    super.dispose();
  }

  void _load(PublisherModel publisher) {
    if (_ready) return;
    _existing = publisher;
    _nameController.text = publisher.name;
    _phoneController.text = publisher.phone ?? '';
    _ageController.text = publisher.age != null && publisher.age! > 0
        ? '${publisher.age}'
        : '';
    _privilege = publisher.privilege;
    _pioneer = publisher.pioneer;
    _gender = publisher.gender == 'feminino' ? 'feminino' : 'masculino';
    _status = publisher.status == 'inactive' ? 'inactive' : 'active';
    _groupId = publisher.groupId;
    _ready = true;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final repo = ref.read(publisherRepositoryProvider);
    final parsedAge = int.tryParse(_ageController.text.trim());
    final age = parsedAge != null && parsedAge > 0 ? parsedAge : null;
    final phone = _phoneController.text.trim();
    final base = _existing;
    final publisher = PublisherModel(
      id: widget.publisherId ?? '',
      name: _nameController.text.trim(),
      privilege: _privilege,
      pioneer: _pioneer,
      indicador: base?.indicador ?? false,
      microfone: base?.microfone ?? false,
      som: base?.som ?? false,
      estudante: base?.estudante ?? false,
      volante: base?.volante ?? false,
      needsElderlySupport: base?.needsElderlySupport ?? false,
      driver: base?.driver ?? false,
      congregationId: base?.congregationId,
      phone: phone.isEmpty ? null : phone,
      email: base?.email,
      groupId: _groupId,
      userId: base?.userId,
      gender: _gender,
      age: age,
      status: _status,
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

    final groups = ref.watch(publisherGroupsProvider).maybeWhen(
          data: (items) => items,
          orElse: () => const [],
        );

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
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _ageController,
                          decoration: const InputDecoration(labelText: 'Idade'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _gender,
                          decoration: const InputDecoration(labelText: 'Gênero'),
                          items: const [
                            DropdownMenuItem(
                              value: 'masculino',
                              child: Text('Masculino'),
                            ),
                            DropdownMenuItem(
                              value: 'feminino',
                              child: Text('Feminino'),
                            ),
                          ],
                          onChanged: (value) {
                            if (value != null) setState(() => _gender = value);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  TextFormField(
                    controller: _phoneController,
                    decoration: const InputDecoration(labelText: 'Telefone'),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<String?>(
                    initialValue: groups.any((g) => g.id == _groupId) ? _groupId : null,
                    decoration: const InputDecoration(labelText: 'Grupo'),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('Sem grupo'),
                      ),
                      for (final group in groups)
                        DropdownMenuItem<String?>(
                          value: group.id,
                          child: Text(group.name),
                        ),
                    ],
                    onChanged: (value) => setState(() => _groupId = value),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<String>(
                    initialValue: _status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: const [
                      DropdownMenuItem(value: 'active', child: Text('Ativo')),
                      DropdownMenuItem(value: 'inactive', child: Text('Inativo')),
                    ],
                    onChanged: (value) {
                      if (value != null) setState(() => _status = value);
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<CongregationPrivilege>(
                    initialValue: _privilege,
                    decoration: const InputDecoration(
                      labelText: 'Privilégio congregacional',
                    ),
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
