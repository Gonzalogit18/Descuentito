class ApiConfig {
  // Dispositivo fisico por USB: se usa `adb reverse tcp:3000 tcp:3000`, asi
  // `localhost:3000` del telefono apunta al dev server de la PC.
  //   - Emulador Android: usar 'http://10.0.2.2:3000'
  //   - Produccion (Vercel): 'https://descuentito.vercel.app'
  static const String baseUrl = 'https://descuentito-two.vercel.app';
  static const String askEndpoint = '$baseUrl/api/ask';
}
