import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/promo.dart';

class AskResult {
  final List<Promo> promos;
  final Stream<String> textStream;

  const AskResult({required this.promos, required this.textStream});
}

class AskService {
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

    // The stream's protocol is: a single first line `meta:{json}\n` carrying the
    // structured promos, followed by raw answer text (which itself contains
    // newlines we must preserve). We therefore split off ONLY the first line by
    // hand and forward everything after it verbatim — using a LineSplitter here
    // would strip the markdown line breaks and mash the answer into one line.
    final charStream = response.stream.transform(utf8.decoder);

    final completer = Completer<List<Promo>>();
    final textController = StreamController<String>();
    List<Promo> promos = [];
    bool metaParsed = false;
    String buffer = '';

    void parseMeta(String metaLine) {
      try {
        final jsonStr = metaLine.startsWith('meta:')
            ? metaLine.substring('meta:'.length)
            : metaLine;
        final decoded = jsonDecode(jsonStr) as Map<String, dynamic>;
        final rawPromos = decoded['promos'] as List<dynamic>? ?? [];
        promos = rawPromos
            .map((e) => Promo.fromJson(e as Map<String, dynamic>))
            .toList();
      } catch (_) {
        promos = [];
      }
      metaParsed = true;
      if (!completer.isCompleted) completer.complete(promos);
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
        if (!completer.isCompleted) completer.complete([]);
        textController.close();
        client.close();
      },
      onError: (Object error) {
        if (!completer.isCompleted) completer.completeError(error);
        textController.addError(error);
        textController.close();
        client.close();
      },
      cancelOnError: false,
    );

    final resolvedPromos = await completer.future;
    return AskResult(promos: resolvedPromos, textStream: textController.stream);
  }
}
