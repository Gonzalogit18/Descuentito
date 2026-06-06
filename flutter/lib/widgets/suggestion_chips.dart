import 'dart:ui';
import 'package:flutter/material.dart';
import '../services/ask_service.dart';
import '../theme/app_theme.dart';

// Static example-prompt chips shown on the landing screen
class SuggestionChips extends StatelessWidget {
  final void Function(String) onTap;

  static const List<String> suggestions = [
    'Farmacity hoy',
    'Nafta con descuento',
    'Promos Starbucks',
    'Nike o Adidas',
  ];

  const SuggestionChips({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          'Probá:',
          style: TextStyle(
            fontSize: 12,
            color: AppTheme.textMuted,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: suggestions
              .map((label) => _ChipButton(
                    label: label,
                    onTap: onTap,
                  ))
              .toList(),
        ),
      ],
    );
  }
}

// API-fetched rubro chips — used on landing screen and in clarification responses
class RubroChips extends StatelessWidget {
  final List<ApiOpcion> opciones;
  final void Function(String value) onTap;

  const RubroChips({
    super.key,
    required this.opciones,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (opciones.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: opciones
          .map((op) => _RubroChipButton(opcion: op, onTap: onTap))
          .toList(),
    );
  }
}

// ─────────────────────────────────────────────
// Internal chip variants
// ─────────────────────────────────────────────

class _ChipButton extends StatefulWidget {
  final String label;
  final void Function(String) onTap;

  const _ChipButton({required this.label, required this.onTap});

  @override
  State<_ChipButton> createState() => _ChipButtonState();
}

class _ChipButtonState extends State<_ChipButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap(widget.label);
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.95 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppTheme.radiusChip),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                color: AppTheme.glassWhite,
                borderRadius: BorderRadius.circular(AppTheme.radiusChip),
                border: Border.all(color: AppTheme.glassBorder, width: 1),
              ),
              child: Text(widget.label, style: AppTheme.chipText),
            ),
          ),
        ),
      ),
    );
  }
}

class _RubroChipButton extends StatefulWidget {
  final ApiOpcion opcion;
  final void Function(String) onTap;

  const _RubroChipButton({required this.opcion, required this.onTap});

  @override
  State<_RubroChipButton> createState() => _RubroChipButtonState();
}

class _RubroChipButtonState extends State<_RubroChipButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final hasCount =
        widget.opcion.count != null && widget.opcion.count! > 0;
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap(widget.opcion.value);
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.95 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppTheme.radiusChip),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                color: AppTheme.accent.withOpacity(0.08),
                borderRadius: BorderRadius.circular(AppTheme.radiusChip),
                border: Border.all(
                    color: AppTheme.accent.withOpacity(0.30), width: 1),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    widget.opcion.label,
                    style: AppTheme.chipText.copyWith(
                      color: AppTheme.accent,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (hasCount) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.accent.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${widget.opcion.count}',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.accent,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
