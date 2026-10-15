import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_spacing.dart';
import '../providers/designations_provider.dart';

class AudioVideoRosterScreen extends ConsumerWidget {
  const AudioVideoRosterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rosters = ref.watch(audioVideoRostersProvider);
    return rosters.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => const Center(child: Text('Não foi possível carregar o áudio e vídeo.')),
      data: (items) {
        if (items.isEmpty) return const Center(child: Text('Nenhuma escala enviada.'));
        return ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            for (final roster in items) ...[
              Text(roster.label, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              for (final row in roster.rows)
                ListTile(
                  title: Text('Dia ${row.day}'),
                  subtitle: Text('Indicadores: ${row.attendants.isEmpty ? '—' : row.attendants}\nMicrofones: ${row.microphones.isEmpty ? '—' : row.microphones}\nMesa de som: ${row.sound.isEmpty ? '—' : row.sound}'),
                ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ],
        );
      },
    );
  }
}

class CleaningAssignmentsScreen extends ConsumerWidget {
  const CleaningAssignmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cleaning = ref.watch(cleaningAssignmentsProvider);
    return cleaning.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => const Center(child: Text('Não foi possível carregar a limpeza.')),
      data: (people) {
        final entries = people.entries.where((item) => item.value.trim().isNotEmpty).toList()
          ..sort((a, b) => a.key.compareTo(b.key));
        if (entries.isEmpty) return const Center(child: Text('Nenhuma limpeza enviada.'));
        return ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            for (final entry in entries)
              ListTile(
                title: Text(_label(entry.key)),
                subtitle: Text(entry.value),
              ),
          ],
        );
      },
    );
  }

  String _label(String meetingId) {
    final date = RegExp(r'\d{4}-\d{2}-\d{2}').firstMatch(meetingId)?.group(0);
    final kind = meetingId.startsWith('weekend') ? 'Fim de semana' : 'Meio de semana';
    if (date == null) return kind;
    final parts = date.split('-');
    return '$kind · ${parts[2]}/${parts[1]}/${parts[0]}';
  }
}
