import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:intl/intl.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/field_outing_whatsapp_message.dart';
import '../../assignments/models/assignment_model.dart';
import '../../auth/models/user_model.dart';
import '../../field_groups/models/field_group_model.dart';
import '../../meetings/models/meeting_location_model.dart';
import '../../territories/models/territory_model.dart';

/// Modal: pré-visualiza / edita mensagem WhatsApp para a designação do dia.
class WhatsappAssignmentMessageDialog extends StatefulWidget {
  const WhatsappAssignmentMessageDialog({
    super.key,
    required this.date,
    required this.dayName,
    required this.assignment,
    required this.users,
    required this.locations,
    required this.territories,
    required this.fieldGroups,
  });

  final DateTime date;
  final String dayName;
  final AssignmentModel assignment;
  final List<UserModel> users;
  final List<MeetingLocationModel> locations;
  final List<TerritoryModel> territories;
  final List<FieldGroupModel> fieldGroups;

  @override
  State<WhatsappAssignmentMessageDialog> createState() =>
      _WhatsappAssignmentMessageDialogState();
}

class _WhatsappAssignmentMessageDialogState
    extends State<WhatsappAssignmentMessageDialog> {
  late final TextEditingController _controller;

  static String _territoryLabel(TerritoryModel t) {
    if (t.number != null && t.number!.trim().isNotEmpty) {
      return t.number!.trim();
    }
    return t.name;
  }

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: _buildInitialText());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _buildInitialText() {
    final a = widget.assignment;
    final names = a.conductorIds
        .map((id) => widget.users.where((u) => u.id == id).firstOrNull?.name)
        .whereType<String>()
        .toList();
    final dirigentes = joinDirigentesNames(names);

    final territoryModels = a.allTerritoryIds
        .map((id) => widget.territories.where((t) => t.id == id).firstOrNull)
        .whereType<TerritoryModel>()
        .toList();
    final territoryLine =
        joinPortugueseTerritoryList(territoryModels.map(_territoryLabel).toList());

    if (isSundayAssignmentDate(widget.date)) {
      final groupName = a.groupId != null
          ? widget.fieldGroups
              .where((g) => g.id == a.groupId)
              .firstOrNull
              ?.name
          : null;
      return buildSundayFieldOutingWhatsappMessage(
        date: widget.date,
        groupName: groupName ?? '—',
        dirigentesLine: dirigentes,
        territoriesLine: territoryLine,
      );
    }

    final loc = a.meetingLocationId != null
        ? widget.locations.where((l) => l.id == a.meetingLocationId).firstOrNull
        : null;
    final localName = loc?.name ?? '—';
    return buildMorningFieldOutingWhatsappMessage(
      date: widget.date,
      localName: localName,
      dirigentesLine: dirigentes,
      territoriesLine: territoryLine,
    );
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: _controller.text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copiado para a área de transferência'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _sendPlaceholder() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Envio pelo app em breve'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.sizeOf(context);
    final bodyHeight = (screen.height * 0.5).clamp(200.0, 420.0);
    final contentWidth = math.max(260.0, math.min(520.0, screen.width - 48));

    return AlertDialog(
      title: Row(
        children: [
          const FaIcon(
            FontAwesomeIcons.whatsapp,
            color: Color(0xFF25D366),
            size: 28,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Mensagem WhatsApp',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Text(
                  '${widget.dayName} · ${_formatDate(widget.date)}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
      content: SizedBox(
        width: contentWidth,
        height: bodyHeight,
        child: TextField(
          controller: _controller,
          keyboardType: TextInputType.multiline,
          maxLines: null,
          expands: true,
          textAlignVertical: TextAlignVertical.top,
          decoration: const InputDecoration(
            alignLabelWithHint: true,
            border: OutlineInputBorder(),
            hintText: 'Mensagem…',
          ),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ),
      actions: [
        OutlinedButton.icon(
          onPressed: _copy,
          icon: const Icon(Icons.copy_outlined),
          label: const Text('Copiar'),
        ),
        FilledButton(
          onPressed: _sendPlaceholder,
          child: const Text('Enviar'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Fechar'),
        ),
      ],
    );
  }

  String _formatDate(DateTime d) {
    return DateFormat('d/MM/yyyy', 'pt_BR').format(d);
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final it = iterator;
    return it.moveNext() ? it.current : null;
  }
}
