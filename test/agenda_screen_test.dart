import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:territory_manager/features/home/ui/agenda_screen.dart';

void main() {
  testWidgets('selecting another weekday updates the day program', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: AgendaScreen())));
    await tester.pumpAndSettle();

    expect(find.text('Agenda'), findsOneWidget);
    expect(find.text('Programação do dia'), findsOneWidget);

    await tester.tap(find.text('QUA').first);
    await tester.pumpAndSettle();

    expect(find.text('Reunião Vida e Ministério'), findsOneWidget);
    expect(find.text('Estudo Bíblico de Congregação'), findsOneWidget);

    await tester.tap(find.text('SEG').first);
    await tester.pumpAndSettle();

    expect(find.text('Reunião Vida e Ministério'), findsNothing);
    expect(find.text('Nenhum compromisso neste dia.'), findsOneWidget);
    expect(find.text('Saída de campo'), findsOneWidget);
    expect(find.text('Assembleia de Circuito'), findsOneWidget);
  });
}
