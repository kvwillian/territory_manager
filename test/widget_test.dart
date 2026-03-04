import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:territory_manager/core/theme/app_theme.dart';
import 'package:territory_manager/features/auth/ui/login_screen.dart';
import 'package:territory_manager/shared/widgets/progress_indicator_bar.dart';

void main() {
  testWidgets('Login screen displays Territory Manager title', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const LoginScreen(),
        ),
      ),
    );

    expect(find.text('Gerenciador de Territórios'), findsOneWidget);
    expect(find.text('Entrar'), findsOneWidget);
  });

  testWidgets('ProgressIndicatorBar shows completed/total', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: Scaffold(
          body: ProgressIndicatorBar(
            completed: 3,
            total: 6,
            label: 'Segments',
          ),
        ),
      ),
    );

    expect(find.text('3 / 6'), findsOneWidget);
    expect(find.text('Segments'), findsOneWidget);
  });
}
