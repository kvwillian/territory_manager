import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';

/// First step of congregation invite onboarding.
/// Interface only: no invite validation and no account creation.
class OnboardingWelcomeScreen extends StatelessWidget {
  const OnboardingWelcomeScreen({super.key});

  static const _blue = Color(0xFF2F6FE0);
  static const _blueSoft = Color(0xFFEAF2FC);
  static const _title = Color(0xFF1B2A4A);
  static const _body = Color(0xFF5C6B82);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FB),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenPadding,
                    AppSpacing.xs,
                    AppSpacing.screenPadding,
                    AppSpacing.md,
                  ),
                  child: Column(
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: IconButton(
                          onPressed: () => _leave(context),
                          icon: const Icon(Icons.arrow_back),
                          tooltip: 'Voltar',
                        ),
                      ),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: Image.asset(
                                  'assets/images/onboarding_welcome.jpg',
                                  height: 168,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.lg),
                              Text(
                                'Bem-vindo ao\nTerritory Manager',
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineLarge
                                    ?.copyWith(
                                      color: _title,
                                      fontWeight: FontWeight.w700,
                                      height: 1.15,
                                    ),
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                'Você foi convidado para configurar sua congregação no aplicativo.',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyLarge
                                    ?.copyWith(color: _body, height: 1.4),
                              ),
                              const SizedBox(height: AppSpacing.lg),
                              const _InfoCard(
                                icon: Icons.mail_outline,
                                text:
                                    'Este convite é válido para criar sua conta e configurar os dados da congregação.',
                              ),
                              const SizedBox(height: AppSpacing.md),
                              const _BenefitRow(
                                icon: Icons.settings_outlined,
                                title: 'Configure sua congregação',
                                subtitle:
                                    'Cadastre as informações e horários das reuniões.',
                              ),
                              const _BenefitRow(
                                icon: Icons.people_outline,
                                title: 'Gerencie publicadores e usuários',
                                subtitle:
                                    'Cadastre os publicadores e convide outros usuários.',
                              ),
                              const _BenefitRow(
                                icon: Icons.calendar_today_outlined,
                                title: 'Comece a usar',
                                subtitle:
                                    'Organize territórios, designações, eventos e muito mais.',
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: _blue,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(double.infinity, 52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () => context.push('/onboarding/account'),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('Começar'),
                            SizedBox(width: AppSpacing.sm),
                            Icon(Icons.arrow_forward, size: 18),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () => _leave(context),
                        child: const Text(
                          'O convite não é para você?',
                          style: TextStyle(color: _blue),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  void _leave(BuildContext context) {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/login');
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: OnboardingWelcomeScreen._blueSoft,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: OnboardingWelcomeScreen._blue, size: 20),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: OnboardingWelcomeScreen._title,
                    height: 1.35,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BenefitRow extends StatelessWidget {
  const _BenefitRow({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: OnboardingWelcomeScreen._blueSoft,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: OnboardingWelcomeScreen._blue, size: 20),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: OnboardingWelcomeScreen._title,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: OnboardingWelcomeScreen._body,
                        height: 1.35,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
