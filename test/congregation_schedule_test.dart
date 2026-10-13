import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:territory_manager/features/auth/models/user_model.dart';
import 'package:territory_manager/features/auth/providers/auth_provider.dart';
import 'package:territory_manager/features/congregations/ui/congregation_schedule_screen.dart';

void main() {
  testWidgets('admin sees meeting days and can save', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith(_AdminAuth.new),
        ],
        child: const MaterialApp(
          home: Scaffold(body: CongregationScheduleScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Meio de semana'), findsOneWidget);
    expect(find.text('Fim de semana'), findsOneWidget);
    expect(find.text('Quinta-feira'), findsOneWidget);
    expect(find.text('19:30'), findsOneWidget);
    expect(find.text('Domingo'), findsOneWidget);
    expect(find.text('10:00'), findsOneWidget);
    expect(find.text('Salvar'), findsOneWidget);
  });

  testWidgets('conductor sees meeting times without save', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith(_ConductorAuth.new),
        ],
        child: const MaterialApp(
          home: Scaffold(body: CongregationScheduleScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Horários das reuniões'), findsOneWidget);
    expect(find.text('Salvar'), findsNothing);
  });
}

class _AdminAuth extends AuthNotifier {
  @override
  AuthState build() {
    return AuthAuthenticated(
      const UserModel(
        id: 'admin-1',
        name: 'Admin',
        role: UserRole.admin,
        congregationId: 'default',
      ),
    );
  }
}

class _ConductorAuth extends AuthNotifier {
  @override
  AuthState build() {
    return AuthAuthenticated(
      const UserModel(
        id: 'conductor-1',
        name: 'Condutor',
        role: UserRole.conductor,
        congregationId: 'default',
      ),
    );
  }
}
