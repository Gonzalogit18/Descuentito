import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/promo.dart';

// A single option chip returned by the API (clarification / conversational / rubros)
class ApiOpcion {
  final String label;
  final String value;
  final int? count;

  const ApiOpcion({required this.label, required this.value, this.count});

  factory ApiOpcion.fromJson(Map<String, dynamic> json) {
    return ApiOpcion(
      label: (json['label'] as String?) ?? '',
      value: (json['value'] as String?) ?? '',
      count: json['count'] is int
          ? json['count'] as int
          : (json['count'] is String ? int.tryParse(json['count'] as String) : null),
    );
  }
}

// The full result of a POST /api/ask call
class AskResult {
  /// "promos" | "clarification" | "conversational"
  final String type;

  /// Populated when type == "promos"
  final List<Promo> promos;

  /// Populated when type == "clarification" or "conversational"
  final String? mensaje;

  /// Populated when type == "clarification" or "conversational" (may be empty)
  final List<ApiOpcion> opciones;

  /// Live-streamed assistant text (all types)
  final Stream<String> textStream;

  const AskResult({
    required this.type,
    required this.promos,
    this.mensaje,
    required this.opciones,
    required this.textStream,
  });
}

class AskService {
  // ── GET /api/ask ── fetch available rubros with counts for landing screen
  Future<List<ApiOpcion>> fetchRubros() async {
    try {
      final response = await http
          .get(Uri.parse(ApiConfig.askEndpoint))
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body) as Map<String, dynamic>;
        final rawList = decoded['opciones'] as List<dynamic>? ?? [];
        return rawList
            .map((e) => ApiOpcion.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      // silently fail — landing screen just won't show chips
    }
    return [];
  }

  // ── POST /api/ask ── streaming search
  Future<AskResult> ask(String question) async {
    final client = http.Client();
    final request = http.Request('POST', Uri.parse(ApiConfig.askEndpoint));
    request.headers['Content-Type'] = 'application/json';
    request.body = jsonEncode({'question': question});

    final response = await client.send(request);

    if (response.statusCode != 200) {
      client.close();
      throw Exception('Error ${response.statusCode}: ${response.reasonPhrase}');
    }

    // Protocol:
    //   FIRST line: "meta:{json}\n"
    //   Remaining chunks: plain assistant text (may contain newlines)
    final charStream = response.stream.transform(utf8.decoder);

    final metaCompleter = Completer<_MetaPayload>();
    final textController = StreamController<String>();
    bool metaParsed = false;
    String buffer = '';

    void parseMeta(String metaLine) {
      _MetaPayload payload;
      try {
        final jsonStr = metaLine.startsWith('meta:')
            ? metaLine.substring('meta:'.length)
            : metaLine;
        final decoded = jsonDecode(jsonStr) as Map<String, dynamic>;
        final type = (decoded['type'] as String?) ?? 'promos';

        List<Promo> promos = [];
        if (type == 'promos') {
          final rawPromos = decoded['promos'] as List<dynamic>? ?? [];
          promos = rawPromos
              .map((e) => Promo.fromJson(e as Map<String, dynamic>))
              .toList();
        }

        final mensaje = decoded['mensaje'] as String?;

        final rawOpciones = decoded['opciones'] as List<dynamic>? ?? [];
        final opciones = rawOpciones
            .map((e) => ApiOpcion.fromJson(e as Map<String, dynamic>))
            .toList();

        payload = _MetaPayload(
          type: type,
          promos: promos,
          mensaje: mensaje,
          opciones: opciones,
        );
      } catch (_) {
        payload = _MetaPayload(
          type: 'promos',
          promos: [],
          mensaje: null,
          opciones: [],
        );
      }
      metaParsed = true;
      if (!metaCompleter.isCompleted) metaCompleter.complete(payload);
    }

    charStream.listen(
      (chunk) {
        if (!metaParsed) {
          buffer += chunk;
          final nl = buffer.indexOf('\n');
          if (nl == -1) return; // still accumulating the meta line
          parseMeta(buffer.substring(0, nl));
          final rest = buffer.substring(nl + 1);
          buffer = '';
          if (rest.isNotEmpty) textController.add(rest);
        } else {
          textController.add(chunk);
        }
      },
      onDone: () {
        if (!metaCompleter.isCompleted) {
          metaCompleter.complete(_MetaPayload(
            type: 'promos',
            promos: [],
            mensaje: null,
            opciones: [],
          ));
        }
        textController.close();
        client.close();
      },
      onError: (Object error) {
        if (!metaCompleter.isCompleted) metaCompleter.completeError(error);
        textController.addError(error);
        textController.close();
        client.close();
      },
      cancelOnError: false,
    );

    final meta = await metaCompleter.future;
    return AskResult(
      type: meta.type,
      promos: meta.promos,
      mensaje: meta.mensaje,
      opciones: meta.opciones,
      textStream: textController.stream,
    );
  }
}

class _MetaPayload {
  final String type;
  final List<Promo> promos;
  final String? mensaje;
  final List<ApiOpcion> opciones;

  const _MetaPayload({
    required this.type,
    required this.promos,
    required this.mensaje,
    required this.opciones,
  });
}
