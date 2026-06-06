import 'dart:ui';
import 'package:flutter/material.dart';
import '../models/promo.dart';
import '../services/ask_service.dart';
import '../theme/app_theme.dart';
import '../widgets/animated_background.dart';
import '../widgets/promo_card_widget.dart';
import '../widgets/search_bar_widget.dart';
import '../widgets/shimmer_loading.dart';
import '../widgets/suggestion_chips.dart';

enum _ScreenState { initial, loading, results, error }

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final AskService _askService = AskService();

  _ScreenState _screenState = _ScreenState.initial;
  List<Promo> _promos = [];
  String _answerText = '';
  String _errorMessage = '';

  late AnimationController _heroController;
  late Animation<double> _heroOpacity;
  late Animation<double> _heroScale;

  @override
  void initState() {
    super.initState();
    _heroController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 450),
    );
    _heroOpacity = Tween<double>(begin: 1, end: 0).animate(
      CurvedAnimation(parent: _heroController, curve: Curves.easeInOut),
    );
    _heroScale = Tween<double>(begin: 1, end: 0.85).animate(
      CurvedAnimation(parent: _heroController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    _heroController.dispose();
    super.dispose();
  }

  Future<void> _submitQuery(String query) async {
    if (query.trim().isEmpty) return;

    _textController.text = query;

    final wasInitial = _screenState == _ScreenState.initial;

    setState(() {
      _screenState = _ScreenState.loading;
      _promos = [];
      _answerText = '';
      _errorMessage = '';
    });

    if (wasInitial) {
      await _heroController.forward();
    }

    try {
      final result = await _askService.ask(query);

      setState(() {
        _promos = result.promos;
        _screenState = _ScreenState.results;
      });

      result.textStream.listen(
        (chunk) {
          if (mounted) {
            setState(() {
              _answerText += chunk;
            });
          }
        },
        onError: (_) {},
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _screenState = _ScreenState.error;
          _errorMessage = e.toString();
        });
      }
    }
  }

  void _retry() {
    final text = _textController.text.trim();
    if (text.isNotEmpty) _submitQuery(text);
  }

  Future<void> _resetSearch() async {
    await _heroController.reverse();
    if (mounted) {
      setState(() {
        _screenState = _ScreenState.initial;
        _textController.clear();
        _promos = [];
        _answerText = '';
        _errorMessage = '';
      });
    }
    _scrollController.jumpTo(0);
  }

  @override
  Widget build(BuildContext context) {
    final isInitial = _screenState == _ScreenState.initial;

    return Scaffold(
      backgroundColor: AppTheme.background,
      resizeToAvoidBottomInset: true,
      body: AnimatedBackground(
        child: SafeArea(
          child: Column(
            children: [
              if (!isInitial)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: SearchBarWidget(
                    controller: _textController,
                    onSubmit: _submitQuery,
                    onClear: _resetSearch,
                    isLoading: _screenState == _ScreenState.loading,
                  ),
                ),
              Expanded(
                child: isInitial
                    ? _InitialView(
                        controller: _textController,
                        onSubmit: _submitQuery,
                        heroOpacity: _heroOpacity,
                        heroScale: _heroScale,
                        isLoading: _screenState == _ScreenState.loading,
                      )
                    : _ResultsView(
                        screenState: _screenState,
                        promos: _promos,
                        answerText: _answerText,
                        errorMessage: _errorMessage,
                        scrollController: _scrollController,
                        onRetry: _retry,
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InitialView extends StatelessWidget {
  final TextEditingController controller;
  final void Function(String) onSubmit;
  final Animation<double> heroOpacity;
  final Animation<double> heroScale;
  final bool isLoading;

  const _InitialView({
    required this.controller,
    required this.onSubmit,
    required this.heroOpacity,
    required this.heroScale,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: heroOpacity,
      builder: (context, _) {
        return Opacity(
          opacity: heroOpacity.value,
          child: Transform.scale(
            scale: heroScale.value,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  const Spacer(flex: 3),
                  const _LogoGlyph(),
                  const SizedBox(height: 20),
                  Text('Descuentito', style: AppTheme.appTitle),
                  const SizedBox(height: 8),
                  Text(
                    'Preguntá por descuentos vigentes hoy',
                    style: AppTheme.appSubtitle,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 36),
                  SearchBarWidget(
                    controller: controller,
                    onSubmit: onSubmit,
                    isLoading: isLoading,
                  ),
                  const SizedBox(height: 20),
                  SuggestionChips(onTap: onSubmit),
                  const Spacer(flex: 4),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _LogoGlyph extends StatefulWidget {
  const _LogoGlyph();

  @override
  State<_LogoGlyph> createState() => _LogoGlyphState();
}

class _LogoGlyphState extends State<_LogoGlyph>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulse;
  late Animation<double> _glowSize;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
    _glowSize = Tween<double>(begin: 0.06, end: 0.20).animate(
      CurvedAnimation(parent: _pulse, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _glowSize,
      builder: (context, _) {
        return Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.accent.withOpacity(0.1),
            boxShadow: [
              BoxShadow(
                color: AppTheme.accent.withOpacity(_glowSize.value),
                blurRadius: 32,
                spreadRadius: 4,
              ),
            ],
            border: Border.all(
              color: AppTheme.accent.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: const Center(
            child: Text(
              '%',
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.w900,
                color: AppTheme.accent,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ResultsView extends StatelessWidget {
  final _ScreenState screenState;
  final List<Promo> promos;
  final String answerText;
  final String errorMessage;
  final ScrollController scrollController;
  final VoidCallback onRetry;

  const _ResultsView({
    required this.screenState,
    required this.promos,
    required this.answerText,
    required this.errorMessage,
    required this.scrollController,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    if (screenState == _ScreenState.loading) {
      return SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: const ShimmerLoading(),
      );
    }

    if (screenState == _ScreenState.error) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _ErrorCard(message: errorMessage, onRetry: onRetry),
        ),
      );
    }

    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        if (answerText.isNotEmpty) ...[
          _AnswerCard(text: answerText),
          const SizedBox(height: 16),
        ],
        ...promos.asMap().entries.map(
              (entry) => PromoCardWidget(
                promo: entry.value,
                index: entry.key,
              ),
            ),
        if (promos.isEmpty && answerText.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.only(top: 40),
              child: Text(
                'Sin resultados para esta búsqueda.',
                style: TextStyle(color: AppTheme.textSecondary),
              ),
            ),
          ),
      ],
    );
  }
}

class _AnswerCard extends StatefulWidget {
  final String text;

  const _AnswerCard({required this.text});

  @override
  State<_AnswerCard> createState() => _AnswerCardState();
}

class _AnswerCardState extends State<_AnswerCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    )..forward();
    _opacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
          child: Container(
            decoration: AppTheme.accentGlassDecoration(),
            padding: const EdgeInsets.all(20),
            child: Text(widget.text, style: AppTheme.answerText),
          ),
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorCard({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppTheme.radiusCard),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.glassWhite,
            borderRadius: BorderRadius.circular(AppTheme.radiusCard),
            border: Border.all(
              color: AppTheme.errorColor.withOpacity(0.3),
              width: 1,
            ),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded,
                  size: 40, color: AppTheme.errorColor),
              const SizedBox(height: 12),
              const Text(
                'No se pudo conectar con el servidor',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                message,
                style: AppTheme.cardBody,
                textAlign: TextAlign.center,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 20),
              GestureDetector(
                onTap: onRetry,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppTheme.accent.withOpacity(0.4),
                      width: 1,
                    ),
                  ),
                  child: const Text(
                    'Reintentar',
                    style: TextStyle(
                      color: AppTheme.accent,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
