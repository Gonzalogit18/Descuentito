class Promo {
  final String marca;
  final String rubro;
  final String titulo;
  final String descripcion;
  final String? descuentoPct;
  final String? medioPago;
  final String? dias;
  final String? topeReintegro;
  final String? fechaHasta;

  const Promo({
    required this.marca,
    required this.rubro,
    required this.titulo,
    required this.descripcion,
    this.descuentoPct,
    this.medioPago,
    this.dias,
    this.topeReintegro,
    this.fechaHasta,
  });

  factory Promo.fromJson(Map<String, dynamic> json) {
    return Promo(
      marca: (json['marca'] as String?) ?? '',
      rubro: (json['rubro'] as String?) ?? '',
      titulo: (json['titulo'] as String?) ?? '',
      descripcion: (json['descripcion'] as String?) ?? '',
      descuentoPct: json['descuento_pct']?.toString(),
      medioPago: json['medio_pago'] as String?,
      dias: json['dias'] is List ? (json['dias'] as List).join(', ') : json['dias'] as String?,
      topeReintegro: json['tope'] as String?,
      fechaHasta: json['fecha_hasta'] as String?,
    );
  }
}
