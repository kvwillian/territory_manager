import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:territory_manager/features/onboarding/ui/create_account_placeholder_screen.dart';
import 'package:territory_manager/features/onboarding/ui/onboarding_welcome_screen.dart';

void main() {
  testWidgets('Começar opens the account placeholder', (tester) async {
    final router = GoRouter(
      initialLocation: '/onboarding',
      routes: [
        GoRoute(
          path: '/onboarding',
          builder: (context, state) => const OnboardingWelcomeScreen(),
        ),
        GoRoute(
          path: '/onboarding/account',
          builder: (context, state) => const CreateAccountPlaceholderScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const Scaffold(body: Text('Login')),
        ),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    expect(find.text('Bem-vindo ao\nTerritory Manager'), findsOneWidget);
    expect(find.text('Configure sua congregação'), findsOneWidget);
    expect(find.text('Gerencie publicadores e usuários'), findsOneWidget);
    expect(find.text('Comece a usar'), findsOneWidget);

    await tester.tap(find.text('Começar'));
    await tester.pumpAndSettle();

    expect(find.text('Criar sua conta'), findsOneWidget);
  });

  testWidgets('invite link returns to login when there is no previous page', (
    tester,
  ) async {
    final router = GoRouter(
      initialLocation: '/onboarding',
      routes: [
        GoRoute(
          path: '/onboarding',
          builder: (context, state) => const OnboardingWelcomeScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const Scaffold(body: Text('Tela de login')),
        ),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    await tester.tap(find.text('O convite não é para você?'));
    await tester.pumpAndSettle();

    expect(find.text('Tela de login'), findsOneWidget);
  });
}
