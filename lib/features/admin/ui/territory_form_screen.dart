import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/widgets/address_search_field.dart';
import '../data/mock_territory_repository.dart';
import 'admin_shell.dart';
import '../../meetings/models/meeting_location_model.dart';
import '../../territories/models/segment_model.dart';
import '../../territories/models/segment_status.dart';
import '../../territories/models/territory_model.dart';
import '../providers/territories_provider.dart';
import '../../../../shared/widgets/app_card.dart';
import '../widgets/neighborhood_dropdown.dart';
import '../../neighborhoods/models/neighborhood_model.dart';
import '../../neighborhoods/providers/neighborhoods_provider.dart';

/// Create territory screen.
class CreateTerritoryScreen extends ConsumerStatefulWidget {
  const CreateTerritoryScreen({super.key});

  @override
  ConsumerState<CreateTerritoryScreen> createState() =>
      _CreateTerritoryScreenState();
}

class _CreateTerritoryScreenState extends ConsumerState<CreateTerritoryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _numberController = TextEditingController();
  final _nameController = TextEditingController();
  String? _selectedNeighborhoodId;
  final _addressController = TextEditingController();
  final _imageUrlController = TextEditingController();
  final _mapsUrlController = TextEditingController();
  final _centroidLatController = TextEditingController();
  final _centroidLngController = TextEditingController();
  final List<_SegmentEntry> _segments = [];

  @override
  void dispose() {
    _numberController.dispose();
    _nameController.dispose();
    _addressController.dispose();
    _imageUrlController.dispose();
    _mapsUrlController.dispose();
    _centroidLatController.dispose();
    _centroidLngController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final neighborhoods = ref.read(neighborhoodsProvider).value ?? [];
    NeighborhoodModel? selected;
    for (final n in neighborhoods) {
      if (n.id == _selectedNeighborhoodId) {
        selected = n;
        break;
      }
    }
    if (selected == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selecione um bairro'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final repo = ref.read(territoryRepositoryProvider);
    final territory = TerritoryModel(
      id: '',
      name: _nameController.text.trim(),
      neighborhood: selected.name,
      neighborhoodId: selected.id,
      number: _numberController.text.trim().isEmpty
          ? null
          : _numberController.text.trim(),
      address: _addressController.text.trim().isEmpty
          ? null
          : _addressController.text.trim(),
      shortAddress: _addressController.text.trim().isEmpty
          ? null
          : MeetingLocationModel.deriveShortLocation(_addressController.text.trim()),
      imageUrl: _imageUrlController.text.trim().isEmpty
          ? null
          : _imageUrlController.text.trim(),
      mapsUrl: _mapsUrlController.text.trim().isEmpty
          ? null
          : _mapsUrlController.text.trim(),
      centroidLat: double.tryParse(_centroidLatController.text),
      centroidLng: double.tryParse(_centroidLngController.text),
      segments: _segments
          .map(
            (e) => SegmentModel(
              id: '',
              territoryId: '',
              description: e.controller.text.trim(),
              status: SegmentStatus.pending,
            ),
          )
          .toList(),
    );

    await repo.createTerritory(territory);
    ref.invalidate(territoriesProvider);
    if (mounted) {
      context.go('/admin/territories');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Território criado'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminShell(
      title: 'Novo Território',
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
                    Row(
                      children: [
                        Expanded(
                          flex: 1,
                          child: TextFormField(
                            controller: _numberController,
                            decoration: const InputDecoration(
                              labelText: 'Número',
                              hintText: 'Ex: 01',
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          flex: 2,
                          child: TextFormField(
                            controller: _nameController,
                            decoration: const InputDecoration(
                              labelText: 'Nome do território',
                            ),
                            validator: (v) =>
                                v == null || v.isEmpty ? 'Obrigatório' : null,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    NeighborhoodDropdown(
                      selectedId: _selectedNeighborhoodId,
                      onChanged: (id) => setState(() => _selectedNeighborhoodId = id),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AddressSearchField(
                      addressController: _addressController,
                      latController: _centroidLatController,
                      lngController: _centroidLngController,
                      labelText: 'Endereço',
                      hintText: 'Digite a rua e selecione',
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _imageUrlController,
                      decoration: const InputDecoration(
                        labelText: 'URL da imagem',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _mapsUrlController,
                      decoration: const InputDecoration(
                        labelText: 'URL do Google Maps',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _centroidLatController,
                            decoration: const InputDecoration(
                              labelText: 'Latitude (centro)',
                            ),
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: TextFormField(
                            controller: _centroidLngController,
                            decoration: const InputDecoration(
                              labelText: 'Longitude (centro)',
                            ),
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sectionSpacing),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Segmentos',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        _segments.add(_SegmentEntry(controller: TextEditingController()));
                      });
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Adicionar segmento'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              ..._segments.asMap().entries.map((entry) {
                final i = entry.key;
                final seg = entry.value;
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: AppCard(
                    child: Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: seg.controller,
                            decoration: const InputDecoration(
                              labelText: 'Descrição',
                              hintText: 'Ex: Rua X (lado direito)',
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () {
                            setState(() {
                              seg.controller.dispose();
                              _segments.removeAt(i);
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _save,
                child: const Text('Criar território'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SegmentEntry {
  _SegmentEntry({required this.controller});
  final TextEditingController controller;
}
