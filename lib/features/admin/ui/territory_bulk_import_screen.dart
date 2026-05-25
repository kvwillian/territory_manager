import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../auth/models/user_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../../neighborhoods/providers/neighborhoods_provider.dart';
import '../../territories/models/territory_model.dart';
import '../providers/territories_provider.dart';
import '../providers/users_provider.dart';
import '../providers/work_sessions_provider.dart';
import '../services/territory_history_import_service.dart';
import '../utils/territory_history_csv_parser.dart';
import '../utils/territory_history_bulk_import_resolver.dart';
import 'admin_shell.dart';
import '../../../../shared/widgets/app_card.dart';

/// Importação em massa: **CSV** (recomendado) ou texto livre (DD.MM - …).
class TerritoryBulkImportScreen extends ConsumerStatefulWidget {
  const TerritoryBulkImportScreen({super.key});

  @override
  ConsumerState<TerritoryBulkImportScreen> createState() =>
      _TerritoryBulkImportScreenState();
}

class _TerritoryBulkImportScreenState
    extends ConsumerState<TerritoryBulkImportScreen> {
  final _controller = TextEditingController();
  int _year = DateTime.now().year;
  String? _neighborhoodOverride;
  List<ResolvedTerritoryHistoryLine>? _preview;
  String? _previewError;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _runPreview() {
    setState(() {
      _previewError = null;
      _preview = null;
    });
    try {
      final parsed = parseTerritoryImport(_controller.text);
      if (parsed.isEmpty) {
        setState(() => _previewError =
            'Nenhuma linha válida. CSV: cabeçalho data,bairro,territorio (ver documentação). '
            'Texto: DD.MM - dirigente - refs.');
        return;
      }
      final asyncT = ref.read(territoriesProvider);
      final asyncU = ref.read(usersProvider);
      final territories = asyncT.maybeWhen(
        data: (t) => t,
        orElse: () => <TerritoryModel>[],
      );
      final users = asyncU.maybeWhen(
        data: (u) => u,
        orElse: () => <UserModel>[],
      );

      if (territories.isEmpty) {
        setState(() => _previewError = 'Carregue os territórios primeiro.');
        return;
      }

      final auth = ref.read(authStateProvider);
      final fallbackId = auth is AuthAuthenticated ? auth.user.id : '';

      final resolved = resolveTerritoryHistoryImport(
        parsed: parsed,
        territories: territories,
        users: users,
        fallbackConductorUserId: fallbackId,
        filterNeighborhood: _neighborhoodOverride,
      );
      setState(() => _preview = resolved);
    } catch (e) {
      setState(() => _previewError = e.toString());
    }
  }

  Future<void> _apply() async {
    final preview = _preview;
    if (preview == null) return;
    final linesWithSegments =
        preview.where((l) => l.segments.isNotEmpty).toList();
    if (linesWithSegments.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Nada para aplicar (sem segmentos resolvidos).'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar importação'),
        content: Text(
          'Serão atualizados os segmentos concluídos e criadas '
          '${linesWithSegments.length} linha(s) de histórico (sessões). '
          'Datas de "último trabalho" usam a mais recente quando há várias.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Aplicar'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;

    try {
      final service = ref.read(territoryHistoryImportServiceProvider);
      final cid = ref.read(currentCongregationProvider);
      final result = await service.apply(
        resolved: linesWithSegments,
        year: _year,
        congregationId: cid,
      );
      ref.invalidate(territoriesProvider);
      ref.invalidate(workSessionsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Importação concluída: ${result.segmentsUpdated} segmento(s), '
            '${result.workSessionsCreated} sessão(ões).',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      context.go('/admin/territories');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro: $e'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final neighborhoodsAsync = ref.watch(neighborhoodsProvider);
    final neighborhoods = neighborhoodsAsync.maybeWhen(
      data: (n) => n,
      orElse: () => [],
    );

    final showYearPicker = _preview == null ||
        _preview!.any((p) => p.parsed.resolvedDate == null);

    return AdminShell(
      title: 'Importar histórico',
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'CSV (recomendado): primeira linha com colunas '
              'data, bairro, territorio (obrigatórias) e opcionalmente '
              'segmento, dirigente, notas. '
              'Data preferencial AAAA-MM-DD (ex.: 2026-04-19); também aceita DD/MM/AAAA. '
              'Separador: vírgula ou ponto e vírgula (Excel BR).\n\n'
              'Texto livre: formato DD.MM - Dirigente - refs; cabeçalhos de bairro em linha só. '
              'Especificação completa: docs/territorio_importacao_csv.md',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      if (showYearPicker) ...[
                        Expanded(
                          child: DropdownButtonFormField<int>(
                            value: _year,
                            decoration: const InputDecoration(
                              labelText: 'Ano (só texto DD.MM sem ano)',
                            ),
                            items: List.generate(
                              6,
                              (i) => DateTime.now().year - 2 + i,
                            )
                                .map(
                                  (y) => DropdownMenuItem(
                                    value: y,
                                    child: Text('$y'),
                                  ),
                                )
                                .toList(),
                            onChanged: (y) {
                              if (y != null) setState(() => _year = y);
                            },
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                      ],
                      Expanded(
                        flex: showYearPicker ? 2 : 1,
                        child: DropdownButtonFormField<String?>(
                          value: _neighborhoodOverride,
                          decoration: const InputDecoration(
                            labelText: 'Filtrar bairro (opcional)',
                            hintText: 'CSV: ignora se cada linha já tem bairro',
                          ),
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text('— Do texto —'),
                            ),
                            ...neighborhoods.map(
                              (n) => DropdownMenuItem(
                                value: n.name,
                                child: Text(n.name),
                              ),
                            ),
                          ],
                          onChanged: (v) =>
                              setState(() => _neighborhoodOverride = v),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  TextField(
                    controller: _controller,
                    maxLines: 14,
                    decoration: const InputDecoration(
                      alignLabelWithHint: true,
                      labelText: 'Lista',
                      hintText:
                          'data,bairro,territorio,segmento,dirigente,notas\n2026-04-19,Laranjeiras,15,,Bessa,',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      FilledButton(
                        onPressed: _runPreview,
                        child: const Text('Pré-visualizar'),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      if (_preview != null &&
                          _preview!.any((l) => l.segments.isNotEmpty))
                        FilledButton.tonal(
                          onPressed: _apply,
                          child: const Text('Aplicar importação'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            if (_previewError != null) ...[
              const SizedBox(height: AppSpacing.md),
              Text(
                _previewError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            if (_preview != null) ...[
              const SizedBox(height: AppSpacing.lg),
              Text(
                'Pré-visualização',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppSpacing.sm),
              ..._preview!.map((line) {
                final ok = line.unresolvedTokens.isEmpty &&
                    line.segments.isNotEmpty;
                final partial = line.segments.isNotEmpty &&
                    line.unresolvedTokens.isNotEmpty;
                return Card(
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: ListTile(
                    leading: Icon(
                      ok
                          ? Icons.check_circle_outline
                          : partial
                              ? Icons.warning_amber_rounded
                              : Icons.error_outline,
                      color: ok
                          ? Colors.green
                          : partial
                              ? Colors.orange
                              : Theme.of(context).colorScheme.error,
                    ),
                    title: Text(
                      'L${line.parsed.sourceLineNumber}: ${line.parsed.rawLine}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      [
                        if (line.segments.isNotEmpty)
                          'Segmentos: ${line.segments.map((s) => '${s.territoryNumber}/${s.segmentDescription}').join(', ')}',
                        if (line.unresolvedTokens.isNotEmpty)
                          'Não resolvido: ${line.unresolvedTokens.join(', ')}',
                        if (line.conductorNote != null) line.conductorNote!,
                      ].join('\n'),
                    ),
                    isThreeLine: true,
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
  }
}
