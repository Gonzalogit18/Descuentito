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
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _CardHeader(promo: widget.promo),
                    const SizedBox(height: 12),
                    if (widget.promo.descuentoPct != null &&
                        widget.promo.descuentoPct!.isNotEmpty) ...[
                      Text(widget.promo.descuentoPct!, style: AppTheme.cardDiscount),
                      const SizedBox(height: 4),
                    ],
                    Text(widget.promo.titulo, style: AppTheme.cardBrandName),
                    if (widget.promo.descripcion.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(widget.promo.descripcion, style: AppTheme.cardBody),
                    ],
                    const SizedBox(height: 12),
                    _CardMeta(promo: widget.promo),
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

class _CardHeader extends StatelessWidget {
  final Promo promo;

  const _CardHeader({required this.promo});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(promo.marca, style: AppTheme.cardBrandName),
        ),
        if (promo.rubro.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
    );
  }
}

class _CardMeta extends StatelessWidget {
  final Promo promo;

  const _CardMeta({required this.promo});

  @override
  Widget build(BuildContext context) {
    final items = <_MetaItem>[];

    if (promo.medioPago != null && promo.medioPago!.isNotEmpty) {
      items.add(_MetaItem(icon: Icons.credit_card_outlined, text: promo.medioPago!));
    }
    if (promo.dias != null && promo.dias!.isNotEmpty) {
      items.add(_MetaItem(icon: Icons.calendar_today_outlined, text: promo.dias!));
    }
    if (promo.topeReintegro != null && promo.topeReintegro!.isNotEmpty) {
      items.add(_MetaItem(icon: Icons.attach_money_outlined, text: 'Tope: ${promo.topeReintegro!}'));
    }
    if (promo.fechaHasta != null && promo.fechaHasta!.isNotEmpty) {
      items.add(_MetaItem(icon: Icons.schedule_outlined, text: 'Hasta ${promo.fechaHasta!}'));
    }

    if (items.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 16,
      runSpacing: 6,
      children: items
          .map((item) => Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(item.icon, size: 13, color: AppTheme.textMuted),
                  const SizedBox(width: 4),
                  Text(item.text, style: AppTheme.cardLabel),
                ],
              ))
          .toList(),
    );
  }
}

class _MetaItem {
  final IconData icon;
  final String text;

  const _MetaItem({required this.icon, required this.text});
}
