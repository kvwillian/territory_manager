import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../../../shared/widgets/address_search_field.dart';
import '../data/mock_territory_repository.dart';
import '../../meetings/models/meeting_location_model.dart';
import '../../territories/models/segment_model.dart';
import '../../territories/models/segment_status.dart';
import '../../territories/models/territory_model.dart';
import '../providers/territories_provider.dart';
import 'admin_shell.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/cached_territory_image.dart';
import '../../../../shared/widgets/territory_image_placeholder.dart';
import '../widgets/neighborhood_dropdown.dart';
import '../../neighborhoods/models/neighborhood_model.dart';
import '../../neighborhoods/providers/neighborhoods_provider.dart';

/// Edit territory screen.
class EditTerritoryScreen extends ConsumerStatefulWidget {
  const EditTerritoryScreen({
    super.key,
    required this.territoryId,
  });

  final String territoryId;

  @override
  ConsumerState<EditTerritoryScreen> createState() => _EditTerritoryScreenState();
}

class _EditTerritoryScreenState extends ConsumerState<EditTerritoryScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _numberController;
  late TextEditingController _nameController;
  String? _selectedNeighborhoodId;
  late TextEditingController _addressController;
  late TextEditingController _imageUrlController;
  late TextEditingController _mapsUrlController;
  late TextEditingController _centroidLatController;
  late TextEditingController _centroidLngController;
  late List<_SegmentEntry> _segments;
  TerritoryModel? _territory;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _numberController = TextEditingController();
    _nameController = TextEditingController();
    _addressController = TextEditingController();
    _imageUrlController = TextEditingController();
    _mapsUrlController = TextEditingController();
    _centroidLatController = TextEditingController();
    _centroidLngController = TextEditingController();
    _segments = [];
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadTerritory());
  }

  @override
  void dispose() {
    _numberController.dispose();
    _nameController.dispose();
    _addressController.dispose();
    _imageUrlController.dispose();
    _mapsUrlController.dispose();
    _centroidLatController.dispose();
    _centroidLngController.dispose();
    for (final s in _segments) {
      s.controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadTerritory() async {
    final repo = ref.read(territoryRepositoryProvider);
    final t = await repo.getTerritoryById(widget.territoryId);
    if (t != null && mounted) {
      setState(() {
        _territory = t;
        _numberController.text = t.number ?? '';
        _nameController.text = t.name;
        _selectedNeighborhoodId = t.neighborhoodId;
        _addressController.text = t.address ?? '';
        _imageUrlController.text = t.imageUrl ?? '';
        _mapsUrlController.text = t.mapsUrl ?? '';
        _centroidLatController.text = t.centroidLat?.toString() ?? '';
        _centroidLngController.text = t.centroidLng?.toString() ?? '';
        _segments = t.segments
            .map(
              (s) => _SegmentEntry(
                controller: TextEditingController(text: s.description),
                segmentId: s.id,
              ),
            )
            .toList();
        _loading = false;
      });
    } else if (mounted) {
      setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_territory == null || !_formKey.currentState!.validate()) return;

    final repo = ref.read(territoryRepositoryProvider);
    final segments = _segments.asMap().entries.map((e) {
      final seg = e.value;
      final existing = e.key < _territory!.segments.length
          ? _territory!.segments[e.key]
          : null;
      return SegmentModel(
        id: seg.segmentId ?? 's${_territory!.id}_${e.key}',
        territoryId: _territory!.id,
        description: seg.controller.text.trim(),
        status: existing?.status ?? SegmentStatus.pending,
        lastWorkedDate: existing?.lastWorkedDate,
      );
    }).toList();

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

    final updated = _territory!.copyWith(
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
      segments: segments,
    );

    await repo.updateTerritory(updated);
    ref.invalidate(territoriesProvider);
    if (mounted) {
      context.go('/admin/territories');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Território atualizado'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showExpandedImage(BuildContext context, String url) {
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 4,
                child: SizedBox(
                  width: MediaQuery.of(context).size.width - 48,
                  height: MediaQuery.of(context).size.height - 96,
                  child: CachedTerritoryImage(
                    imageUrl: url,
                    fit: BoxFit.contain,
                    height: MediaQuery.of(context).size.height - 96,
                    width: MediaQuery.of(context).size.width - 48,
                  ),
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _delete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Excluir território?'),
        content: const Text(
          'Esta ação não pode ser desfeita.',
        ),
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

    if (confirm == true && _territory != null) {
      final repo = ref.read(territoryRepositoryProvider);
      await repo.deleteTerritory(_territory!.id);
      ref.invalidate(territoriesProvider);
      if (mounted) {
        context.go('/admin/territories');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Território excluído'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _territory == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (!_loading && _territory == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Território')),
        body: const Center(child: Text('Território não encontrado')),
      );
    }

    return AdminShell(
          title: 'Editar Território',
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
                          onChanged: (id) =>
                              setState(() => _selectedNeighborhoodId = id),
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
                        const SizedBox(height: AppSpacing.sm),
                        ValueListenableBuilder<TextEditingValue>(
                          valueListenable: _imageUrlController,
                          builder: (context, value, _) {
                            final url = value.text.trim();
                            if (url.isEmpty) {
                              return TerritoryImagePlaceholder(height: 120);
                            }
                            return GestureDetector(
                              onTap: () => _showExpandedImage(context, url),
                              child: CachedTerritoryImage(
                                imageUrl: url,
                                height: 120,
                                width: double.infinity,
                                fit: BoxFit.cover,
                              ),
                            );
                          },
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
                                keyboardType:
                                    const TextInputType.numberWithOptions(
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
                                keyboardType:
                                    const TextInputType.numberWithOptions(
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
                            _segments.add(_SegmentEntry(
                              controller: TextEditingController(),
                            ));
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
                    child: const Text('Salvar alterações'),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  OutlinedButton(
                    onPressed: _delete,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Theme.of(context).colorScheme.error,
                      side: BorderSide(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                    child: const Text('Excluir território'),
                  ),
                ],
              ),
            ),
          ),
        );
  }
}


class _SegmentEntry {
  _SegmentEntry({required this.controller, this.segmentId});
  final TextEditingController controller;
  final String? segmentId;
}
