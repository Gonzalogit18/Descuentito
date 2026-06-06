import 'dart:ui';
import 'package:flutter/material.dart';
import '../models/promo.dart';
import '../theme/app_theme.dart';

class PromoCardWidget extends StatefulWidget {
  final Promo promo;
  final int index;

  const PromoCardWidget({super.key, required this.promo, required this.index});

  @override
  State<PromoCardWidget> createState() => _PromoCardWidgetState();
}

class _PromoCardWidgetState extends State<PromoCardWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _opacity;
  late Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _opacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _slide = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );

    Future.delayed(Duration(milliseconds: 80 * widget.index), () {
      if (mounted) _controller.forward();
    });
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
      child: SlideTransition(
        position: _slide,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppTheme.radiusCard),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
              child: Container(
                decoration: AppTheme.glassDecoration(),
                child: Stack(
                  children: [
                    // Discount badge — top right
                    if (widget.promo.descuentoPct != null)
                      Positioned(
                        top: 14,
                        right: 14,
                        child: _DiscountBadge(pct: widget.promo.descuentoPct!),
                      ),

                    // Card content
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        20,
                        20,
                        // extra right padding when badge is present
                        widget.promo.descuentoPct != null ? 88 : 20,
                        16,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _CardHeader(promo: widget.promo),
                          const SizedBox(height: 10),
                          Text(
                            widget.promo.titulo,
                            style: AppTheme.cardBrandName,
                          ),
                          if (widget.promo.descripcion.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              widget.promo.descripcion,
                              style: AppTheme.cardBody,
                            ),
                          ],
                          const SizedBox(height: 12),
                          _CardMeta(promo: widget.promo),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Large cyan % badge
class _DiscountBadge extends StatelessWidget {
  final int pct;
  const _DiscountBadge({required this.pct});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 68,
      height: 68,
      decoration: BoxDecoration(
        color: AppTheme.accent.withOpacity(0.15),
        shape: BoxShape.circle,
        border: Border.all(color: AppTheme.accent.withOpacity(0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accent.withOpacity(0.20),
            blurRadius: 16,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Center(
        child: Text(
          '$pct%',
          style: TextStyle(
            fontSize: pct >= 100 ? 14 : (pct >= 10 ? 16 : 20),
            fontWeight: FontWeight.w900,
            color: AppTheme.accent,
            letterSpacing: -0.5,
          ),
        ),
      ),
    );
  }
}

// Header: store name + rubro pill
class _CardHeader extends StatelessWidget {
  final Promo promo;
  const _CardHeader({required this.promo});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Text(promo.comercio, style: AppTheme.cardBrandName),
        ),
        if (promo.rubro.isNotEmpty) ...[
          const SizedBox(width: 8),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.accent.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.accent.withOpacity(0.25),
                width: 1,
              ),
            ),
            child: Text(promo.rubro, style: AppTheme.rubroChip),
          ),
        ],
      ],
    );
  }
}

// Meta row: banco_billetera, medio_pago, dias, tope, fecha
class _CardMeta extends StatelessWidget {
  final Promo promo;
  const _CardMeta({required this.promo});

  @override
  Widget build(BuildContext context) {
    final items = <_MetaItem>[];

    // banco_billetera — highlighted in cyan
    if (promo.bancoBilletera != null && promo.bancoBilletera!.isNotEmpty) {
      items.add(_MetaItem(
        icon: Icons.account_balance_wallet_outlined,
        text: promo.bancoBilletera!,
        highlighted: true,
      ));
    }

    // medio_pago — only if different from banco_billetera (case-insensitive)
    final bp = promo.bancoBilletera?.toLowerCase().trim();
    final mp = promo.medioPago?.toLowerCase().trim();
    if (promo.medioPago != null &&
        promo.medioPago!.isNotEmpty &&
        mp != bp) {
      items.add(_MetaItem(
        icon: Icons.credit_card_outlined,
        text: promo.medioPago!,
      ));
    }

    if (promo.diasStr != null && promo.diasStr!.isNotEmpty) {
      items.add(_MetaItem(
        icon: Icons.calendar_today_outlined,
        text: 'Solo: ${promo.diasStr!}',
      ));
    }

    if (promo.topeReintegro != null && promo.topeReintegro!.isNotEmpty) {
      items.add(_MetaItem(
        icon: Icons.attach_money_outlined,
        text: 'Tope: ${promo.topeReintegro!}',
      ));
    }

    if (promo.fechaHasta != null && promo.fechaHasta!.isNotEmpty) {
      items.add(_MetaItem(
        icon: Icons.schedule_outlined,
        text: 'Hasta ${promo.fechaHasta!}',
      ));
    }

    if (items.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: items.map((item) {
        final color = item.highlighted ? AppTheme.accent : AppTheme.textMuted;
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(item.icon, size: 13, color: color),
            const SizedBox(width: 4),
            Text(
              item.text,
              style: AppTheme.cardLabel.copyWith(
                color: item.highlighted
                    ? AppTheme.accent
                    : AppTheme.textMuted,
                fontWeight: item.highlighted
                    ? FontWeight.w600
                    : FontWeight.w500,
              ),
            ),
          ],
        );
      }).toList(),
    );
  }
}

class _MetaItem {
  final IconData icon;
  final String text;
  final bool highlighted;

  const _MetaItem({
    required this.icon,
    required this.text,
    this.highlighted = false,
  });
}
