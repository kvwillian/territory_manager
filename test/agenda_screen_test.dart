import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:territory_manager/features/home/ui/agenda_screen.dart';
import 'package:territory_manager/features/meeting_programs/models/meeting_program.dart';
import 'package:territory_manager/features/meeting_programs/providers/meeting_programs_provider.dart';

void main() {
  testWidgets('selecting another weekday updates the day program', (tester) async {
    final now = DateTime.now();
    final wednesday = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - DateTime.wednesday));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          meetingProgramsProvider.overrideWith((ref) async => [
                MeetingProgram(
                  id: 'midweek_default_${_iso(wednesday)}',
                  kind: 'midweek',
                  date: wednesday,
                  time: '19:30',
                  status: 'published',
                  sections: const [
                    MeetingSection(title: 'Tesouros', parts: [MeetingPart(title: 'Leitura da Bíblia', roles: [])]),
                  ],
                  duties: const [],
                ),
              ]),
        ],
        child: const MaterialApp(home: Scaffold(body: AgendaScreen())),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Agenda'), findsOneWidget);
    expect(find.text('Programação do dia'), findsOneWidget);

    await tester.tap(find.text('QUA').first);
    await tester.pumpAndSettle();

    expect(find.text('Reunião de meio de semana'), findsOneWidget);
    expect(find.text('Leitura da Bíblia'), findsOneWidget);

    await tester.tap(find.text('SEG').first);
    await tester.pumpAndSettle();

    expect(find.text('Reunião de meio de semana'), findsNothing);
    expect(find.text('Nenhum compromisso neste dia.'), findsOneWidget);
    expect(find.text('Saída de campo'), findsOneWidget);
    expect(find.text('Assembleia de Circuito'), findsOneWidget);
  });
}

String _iso(DateTime date) {
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  return '${date.year}-$month-$day';
}
