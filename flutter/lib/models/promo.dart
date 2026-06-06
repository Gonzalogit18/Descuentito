class Promo {
  final String comercio;
  final String? bancoBilletera;
  final String rubro;
  final String titulo;
  final String descripcion;
  final int? descuentoPct;
  final String? medioPago;
  final String? diasStr;
  final String? topeReintegro;
  final String? fechaHasta;
  final String? fuente_url;

  const Promo({
    required this.comercio,
    this.bancoBilletera,
    required this.rubro,
    required this.titulo,
    required this.descripcion,
    this.descuentoPct,
    this.medioPago,
    this.diasStr,
    this.topeReintegro,
    this.fechaHasta,
    this.fuente_url,
  });

  factory Promo.fromJson(Map<String, dynamic> json) {
    // descuento_pct may be int, String, or null
    int? descuentoPct;
    final rawPct = json['descuento_pct'];
    if (rawPct != null) {
      if (rawPct is int) {
        descuentoPct = rawPct;
      } else if (rawPct is double) {
        descuentoPct = rawPct.toInt();
      } else if (rawPct is String && rawPct.isNotEmpty) {
        descuentoPct = int.tryParse(rawPct.replaceAll('%', '').trim());
      }
    }

    // dias may be List<String>, a single String, or null
    String? diasStr;
    final rawDias = json['dias'];
    if (rawDias != null) {
      if (rawDias is List) {
        final parts = rawDias
            .where((e) => e != null)
            .map((e) => e.toString())
            .toList();
        if (parts.isNotEmpty) diasStr = parts.join(', ');
      } else if (rawDias is String && rawDias.isNotEmpty) {
        diasStr = rawDias;
      }
    }

    return Promo(
      comercio: (json['comercio'] as String?) ?? '',
      bancoBilletera: json['banco_billetera'] as String?,
      rubro: (json['rubro'] as String?) ?? '',
      titulo: (json['titulo'] as String?) ?? '',
      descripcion: (json['descripcion'] as String?) ?? '',
      descuentoPct: descuentoPct,
      medioPago: json['medio_pago'] as String?,
      diasStr: diasStr,
      topeReintegro: json['tope_reintegro'] as String?,
      fechaHasta: json['fecha_hasta'] as String?,
      fuente_url: json['fuente_url'] as String?,
    );
  }
}
