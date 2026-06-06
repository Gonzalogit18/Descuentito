import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SuggestionChips extends StatelessWidget {
  final void Function(String) onTap;

  static const List<String> suggestions = [
    '¿Farmacity hoy?',
    'Cargar nafta',
    'Promos Starbucks',
    'Nike o Adidas',
  ];

  const SuggestionChips({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: suggestions
          .map((label) => _SuggestionChip(label: label, onTap: onTap))
          .toList(),
    );
  }
}

class _SuggestionChip extends StatefulWidget {
  final String label;
  final void Function(String) onTap;

  const _SuggestionChip({required this.label, required this.onTap});

  @override
  State<_SuggestionChip> createState() => _SuggestionChipState();
}

class _SuggestionChipState extends State<_SuggestionChip> {
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
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
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
