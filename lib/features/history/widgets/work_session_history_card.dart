import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../assignments/models/work_session_model.dart';
import '../../../../shared/widgets/app_card.dart';

/// Card for one work session: date, dirigente, território, segmentos, notas.
class WorkSessionHistoryCard extends StatelessWidget {
  const WorkSessionHistoryCard({
    super.key,
    required this.session,
    required this.territoryName,
    required this.dirigenteLabel,
  });

  final WorkSessionModel session;
  final String territoryName;

  /// Nome do dirigente ou texto curto (ex.: "Você").
  final String dirigenteLabel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.calendar_today_outlined,
                size: 20,
                color: scheme.primary,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  DateFormat("EEEE, d 'de' MMMM yyyy", 'pt_BR')
                      .format(session.date),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _MetaRow(
            icon: Icons.person_outline,
            label: 'Dirigente',
            value: dirigenteLabel,
          ),
          const SizedBox(height: AppSpacing.sm),
          _MetaRow(
            icon: Icons.map_outlined,
            label: 'Território',
            value: territoryName,
          ),
          const SizedBox(height: AppSpacing.sm),
          _MetaRow(
            icon: Icons.check_circle_outline,
            label: 'Segmentos',
            value:
                '${session.segmentsWorked.length} concluído${session.segmentsWorked.length == 1 ? '' : 's'}',
          ),
          if (session.notes != null && session.notes!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              'Observações',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              session.notes!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontStyle: FontStyle.italic,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 18,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: Theme.of(context).textTheme.bodyMedium,
              children: [
                TextSpan(
                  text: '$label: ',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                TextSpan(
                  text: value,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
