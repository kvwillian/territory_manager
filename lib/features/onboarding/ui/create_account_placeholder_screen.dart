import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';

/// Placeholder for the account step. The form is not wired yet.
class CreateAccountPlaceholderScreen extends StatelessWidget {
  const CreateAccountPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FB),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPadding,
                AppSpacing.xs,
                AppSpacing.screenPadding,
                AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back),
                      tooltip: 'Voltar',
                    ),
                  ),
                  Text(
                    'Criar sua conta',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                          color: const Color(0xFF1B2A4A),
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Primeiro, crie sua conta de acesso. Você será o administrador da congregação.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: const Color(0xFF5C6B82),
                          height: 1.4,
                        ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'O formulário de nome, e-mail e senha entra no próximo passo.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFF5C6B82),
                        ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
