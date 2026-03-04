import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/address_search_field.dart';
import '../../../shared/widgets/app_card.dart';
import '../../admin/providers/territories_provider.dart';
import '../models/meeting_location_model.dart';
import '../providers/meeting_location_repository_provider.dart';
import '../../admin/ui/admin_shell.dart';

/// Edit meeting location screen.
class MeetingLocationEditScreen extends ConsumerStatefulWidget {
  const MeetingLocationEditScreen({
    super.key,
    required this.locationId,
  });

  final String locationId;

  @override
  ConsumerState<MeetingLocationEditScreen> createState() =>
      _MeetingLocationEditScreenState();
}

class _MeetingLocationEditScreenState
    extends ConsumerState<MeetingLocationEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _houseNumberController = TextEditingController();
  final _latController = TextEditingController();
  final _lngController = TextEditingController();
  final _radiusController = TextEditingController();
  final Set<String> _selectedTerritoryIds = {};
  MeetingLocationModel? _location;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadLocation());
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _houseNumberController.dispose();
    _latController.dispose();
    _lngController.dispose();
    _radiusController.dispose();
    super.dispose();
  }

  Future<void> _loadLocation() async {
    final repo = ref.read(meetingLocationRepositoryProvider);
    final loc = await repo.getMeetingLocationById(widget.locationId);
    if (loc != null && mounted) {
      setState(() {
        _location = loc;
        _nameController.text = loc.name;
        _addressController.text = loc.address ?? '';
        _houseNumberController.text = loc.houseNumber ?? '';
        _latController.text = loc.latitude.toString();
        _lngController.text = loc.longitude.toString();
        _radiusController.text = loc.radiusKm.toString();
        _selectedTerritoryIds.addAll(loc.allowedTerritories);
        _loading = false;
      });
    } else if (mounted) {
      setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_location == null || !_formKey.currentState!.validate()) return;

    final lat = double.tryParse(_latController.text);
    final lng = double.tryParse(_lngController.text);
    final radius = double.tryParse(_radiusController.text) ?? 2.0;

    if (lat == null || lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Latitude e longitude são obrigatórios'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final repo = ref.read(meetingLocationRepositoryProvider);
    final updated = _location!.copyWith(
      name: _nameController.text.trim(),
      address: _addressController.text.trim().isEmpty
          ? null
          : _addressController.text.trim(),
      shortLocation: _addressController.text.trim().isEmpty
          ? null
          : MeetingLocationModel.deriveShortLocation(_addressController.text.trim()),
      houseNumber: _houseNumberController.text.trim().isEmpty
          ? null
          : _houseNumberController.text.trim(),
      latitude: lat,
      longitude: lng,
      radiusKm: radius,
      allowedTerritories: _selectedTerritoryIds.toList(),
    );

    await repo.updateMeetingLocation(updated);
    ref.invalidate(meetingLocationsProvider);
    if (mounted) {
      context.go('/admin/meeting-locations');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Local de saída atualizado'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _delete() async {
    if (_location == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir local?'),
        content: Text(
          'Tem certeza que deseja excluir "${_location!.name}"? Esta ação não pode ser desfeita.',
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

    final repo = ref.read(meetingLocationRepositoryProvider);
    await repo.deleteMeetingLocation(_location!.id);
    ref.invalidate(meetingLocationsProvider);
    if (mounted) {
      context.go('/admin/meeting-locations');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Local de saída excluído'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return AdminShell(
        title: 'Editar Local',
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_location == null) {
      return AdminShell(
        title: 'Editar Local',
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: AppSpacing.md),
              const Text('Local não encontrado'),
              const SizedBox(height: AppSpacing.md),
              TextButton(
                onPressed: () => context.go('/admin/meeting-locations'),
                child: const Text('Voltar'),
              ),
            ],
          ),
        ),
      );
    }

    final asyncTerritories = ref.watch(territoriesProvider);

    return AdminShell(
      title: 'Editar Local de Saída',
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
                        hintText: 'Ex: Casa da Irmã Glória',
                      ),
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Obrigatório' : null,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AddressSearchField(
                      addressController: _addressController,
                      latController: _latController,
                      lngController: _lngController,
                      labelText: 'Endereço',
                      hintText: 'Digite a rua, bairro ou endereço e selecione',
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _houseNumberController,
                      decoration: const InputDecoration(
                        labelText: 'Número',
                        hintText: 'Ex: 504',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _latController,
                            decoration: const InputDecoration(
                              labelText: 'Latitude',
                            ),
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Obrigatório';
                              if (double.tryParse(v) == null) return 'Inválido';
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: TextFormField(
                            controller: _lngController,
                            decoration: const InputDecoration(
                              labelText: 'Longitude',
                            ),
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Obrigatório';
                              if (double.tryParse(v) == null) return 'Inválido';
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _radiusController,
                      decoration: const InputDecoration(
                        labelText: 'Raio (km)',
                        hintText: 'Ex: 2',
                      ),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Obrigatório';
                        final n = double.tryParse(v);
                        if (n == null || n <= 0) return 'Deve ser maior que 0';
                        return null;
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sectionSpacing),
              Text(
                'Territórios permitidos',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: AppSpacing.md),
              asyncTerritories.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(AppSpacing.lg),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (e, _) => Text('Erro ao carregar territórios: $e'),
                data: (territories) => Column(
                  children: territories.map((t) {
                    final isSelected = _selectedTerritoryIds.contains(t.id);
                    return CheckboxListTile(
                      title: Text(t.name),
                      subtitle: Text(t.neighborhood),
                      value: isSelected,
                      onChanged: (v) {
                        setState(() {
                          if (v == true) {
                            _selectedTerritoryIds.add(t.id);
                          } else {
                            _selectedTerritoryIds.remove(t.id);
                          }
                        });
                      },
                    );
                  }).toList(),
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
                child: const Text('Excluir local'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
