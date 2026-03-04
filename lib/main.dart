import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app/router.dart';
import 'core/config/firebase_config.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await initializeDateFormatting('pt_BR', null);

  // Initialize Firebase - app can run without it in dev (will show login)
  try {
    await FirebaseConfig.initialize();
  } catch (_) {
    // Firebase not configured - app will show login
    // User can use "Demo" to bypass when Firebase is unavailable
  }

  runApp(
    const ProviderScope(
      child: TerritoryManagerApp(),
    ),
  );
}

class TerritoryManagerApp extends ConsumerWidget {
  const TerritoryManagerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Gerenciador de Territórios',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
