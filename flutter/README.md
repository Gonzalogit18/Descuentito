# Descuentito — Flutter App

AI-powered discount finder for Argentina. Communicates with the Next.js backend via streaming API.

## Requirements

- Flutter SDK >= 3.0.0
- Android SDK (min API 21, target 34)
- Next.js backend running locally on port 3000

## How to run

```bash
cd flutter
flutter pub get
flutter run
```

## API URL configuration

The app connects to `http://10.0.2.2:3000/api/ask` by default (Android emulator → host machine).

For a **physical device**, change `baseUrl` in:
`lib/config/api_config.dart`

```dart
static const String baseUrl = 'http://192.168.1.XXX:3000'; // Your local IP
```

Find your local IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).

## File structure

```
lib/
  main.dart                    # App entry point, theme bootstrap
  config/api_config.dart       # API URL constants
  models/promo.dart            # Promo data class
  services/ask_service.dart    # Streaming HTTP service
  screens/home_screen.dart     # Main screen (initial + results states)
  widgets/
    animated_background.dart   # Drifting radial gradient background
    promo_card_widget.dart     # Individual promo result card
    search_bar_widget.dart     # Glass input bar + send button
    shimmer_loading.dart       # Loading skeleton
    suggestion_chips.dart      # Quick-query chips
  theme/app_theme.dart         # All colors, text styles, decorations
```

## TODOs

- Add `flutter/android/gradle/wrapper/gradle-wrapper.jar` and `gradle-wrapper.properties`
  (generated automatically by `flutter create` or `flutter run` on first run)
- Replace `ic_launcher` icons with a branded icon
- For production: set `baseUrl` to the deployed Next.js URL
- Consider adding `flutter_dotenv` to manage API URLs per environment
