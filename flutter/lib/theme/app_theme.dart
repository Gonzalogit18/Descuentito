import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Colors
  static const Color background = Color(0xFF000000);
  static const Color backgroundAlt = Color(0xFF050505);
  static const Color gradientPurple = Color(0xFF1a0b2e);
  static const Color gradientBlue = Color(0xFF0a1530);
  static const Color accent = Color(0xFF22D3EE);
  static const Color accentMagenta = Color(0xFFE879F9);
  static const Color glassWhite = Color(0x0DFFFFFF);
  static const Color glassBorder = Color(0x1AFFFFFF);
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0x99FFFFFF);
  static const Color textMuted = Color(0x55FFFFFF);
  static const Color errorColor = Color(0xFFFF6B6B);

  // Border radii
  static const double radiusCard = 24.0;
  static const double radiusSmall = 16.0;
  static const double radiusChip = 20.0;
  static const double radiusInput = 28.0;

  // Glass card decoration
  static BoxDecoration glassDecoration({
    double borderRadius = radiusCard,
    Color? borderColor,
  }) {
    return BoxDecoration(
      color: glassWhite,
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: borderColor ?? glassBorder,
        width: 1.0,
      ),
      boxShadow: [
        BoxShadow(
          color: accent.withOpacity(0.04),
          blurRadius: 24,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  static BoxDecoration accentGlassDecoration({
    double borderRadius = radiusCard,
  }) {
    return BoxDecoration(
      color: glassWhite,
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: accent.withOpacity(0.3),
        width: 1.0,
      ),
      boxShadow: [
        BoxShadow(
          color: accent.withOpacity(0.08),
          blurRadius: 32,
          spreadRadius: 0,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  // Text styles
  static TextStyle get appTitle => GoogleFonts.inter(
        fontSize: 32,
        fontWeight: FontWeight.w700,
        color: textPrimary,
        letterSpacing: -0.5,
      );

  static TextStyle get appSubtitle => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: textSecondary,
        letterSpacing: 0.1,
      );

  static TextStyle get cardBrandName => GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: textPrimary,
      );

  static TextStyle get cardDiscount => GoogleFonts.inter(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        color: accent,
        letterSpacing: -0.5,
      );

  static TextStyle get cardBody => GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: textSecondary,
      );

  static TextStyle get cardLabel => GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: textMuted,
        letterSpacing: 0.5,
      );

  static TextStyle get chipText => GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: textSecondary,
      );

  static TextStyle get inputHint => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: textMuted,
      );

  static TextStyle get inputText => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: textPrimary,
      );

  static TextStyle get answerText => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: textPrimary,
        height: 1.6,
      );

  static TextStyle get rubroChip => GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: accent,
        letterSpacing: 0.3,
      );
}
