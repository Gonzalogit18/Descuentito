import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AnimatedBackground extends StatefulWidget {
  final Widget child;

  const AnimatedBackground({super.key, required this.child});

  @override
  State<AnimatedBackground> createState() => _AnimatedBackgroundState();
}

class _AnimatedBackgroundState extends State<AnimatedBackground>
    with TickerProviderStateMixin {
  late AnimationController _controller1;
  late AnimationController _controller2;
  late Animation<Alignment> _alignment1;
  late Animation<Alignment> _alignment2;

  @override
  void initState() {
    super.initState();

    _controller1 = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 25),
    )..repeat(reverse: true);

    _controller2 = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 30),
    )..repeat(reverse: true);

    _alignment1 = TweenSequence<Alignment>([
      TweenSequenceItem(
        tween: AlignmentTween(
          begin: const Alignment(-1.0, -1.0),
          end: const Alignment(-0.6, -0.7),
        ),
        weight: 1,
      ),
    ]).animate(CurvedAnimation(
      parent: _controller1,
      curve: Curves.easeInOut,
    ));

    _alignment2 = TweenSequence<Alignment>([
      TweenSequenceItem(
        tween: AlignmentTween(
          begin: const Alignment(1.0, 1.0),
          end: const Alignment(0.7, 0.8),
        ),
        weight: 1,
      ),
    ]).animate(CurvedAnimation(
      parent: _controller2,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _controller1.dispose();
    _controller2.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_controller1, _controller2]),
      builder: (context, child) {
        return Container(
          decoration: const BoxDecoration(color: AppTheme.background),
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _GradientBlobPainter(
                    alignment1: _alignment1.value,
                    alignment2: _alignment2.value,
                  ),
                ),
              ),
              widget.child,
            ],
          ),
        );
      },
    );
  }
}

class _GradientBlobPainter extends CustomPainter {
  final Alignment alignment1;
  final Alignment alignment2;

  const _GradientBlobPainter({
    required this.alignment1,
    required this.alignment2,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center1 = Offset(
      (alignment1.x + 1) / 2 * size.width,
      (alignment1.y + 1) / 2 * size.height,
    );
    final center2 = Offset(
      (alignment2.x + 1) / 2 * size.width,
      (alignment2.y + 1) / 2 * size.height,
    );

    final paint1 = Paint()
      ..shader = RadialGradient(
        colors: [
          AppTheme.gradientPurple.withOpacity(0.6),
          AppTheme.gradientPurple.withOpacity(0.0),
        ],
        radius: 0.8,
      ).createShader(Rect.fromCircle(
        center: center1,
        radius: size.width * 0.7,
      ));

    final paint2 = Paint()
      ..shader = RadialGradient(
        colors: [
          AppTheme.gradientBlue.withOpacity(0.7),
          AppTheme.gradientBlue.withOpacity(0.0),
        ],
        radius: 0.8,
      ).createShader(Rect.fromCircle(
        center: center2,
        radius: size.width * 0.8,
      ));

    canvas.drawCircle(center1, size.width * 0.7, paint1);
    canvas.drawCircle(center2, size.width * 0.8, paint2);
  }

  @override
  bool shouldRepaint(_GradientBlobPainter oldDelegate) {
    return oldDelegate.alignment1 != alignment1 ||
        oldDelegate.alignment2 != alignment2;
  }
}
