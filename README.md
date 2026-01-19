
# VoucherVault iOS 🎫

VoucherVault ist eine moderne, mobile Gutschein-Verwaltungs-App für iOS, die mit **React Native** und **Expo** entwickelt wurde. Sie ermöglicht das einfache Speichern, Teilen und Verwalten von Gutscheinen in der Cloud.

## Highlights ✨

- **KI-Gutschein-Scan**: Fotografiere deine physischen Gutscheine. Die Google Gemini AI extrahiert automatisch das Geschäft, den Betrag und die Währung.
- **Familien-Sharing**: Erstelle Gruppen und teile Gutscheine mit Familienmitgliedern oder Freunden in Echtzeit.
- **Cloud-Synchronisation**: Dank Supabase-Integration sind deine Daten auf allen Geräten sicher gespeichert.
- **Native iOS Experience**: Optimiert für das iPhone mit FaceID-Placeholder, haptischem Feedback und modernen iOS-UI-Komponenten.
- **Echtzeit-Benachrichtigungen**: Werde informiert, wenn ein Familienmitglied einen Gutschein verwendet oder ein neuer Gutschein geteilt wurde.

## Tech Stack 🛠️

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Backend-as-a-Service**: [Supabase](https://supabase.com/) (Auth, Database, Storage)
- **Künstliche Intelligenz**: [Google Gemini API](https://ai.google.dev/) (Modell: `gemini-3-flash-preview`)
- **Icons**: `@expo/vector-icons` (Ionicons)
- **Image Picker**: `expo-image-picker`

## Installation & Start 🚀

1. **Repository klonen:**
   ```bash
   git clone https://github.com/DEIN_USERNAME/vouchervault-ios.git
   cd vouchervault-ios
   ```

2. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

3. **Lokal starten:**
   ```bash
   npx expo start
   ```
   Scanne den QR-Code mit der **Expo Go App** auf deinem iPhone.

## Build für TestFlight (Expo EAS) 📱

Um einen nativen iOS-Build zu erstellen und ihn auf TestFlight zu pushen:

1. **EAS CLI installieren:** `npm install -g eas-cli`
2. **Login:** `eas login`
3. **API Key hinterlegen:**
   ```bash
   eas secrets:create --name API_KEY --value DEIN_GEMINI_API_KEY
   ```
4. **Build starten:** `eas build --platform ios`

## Konfiguration ⚙️

### Supabase
Die App nutzt ein vordefiniertes Supabase-Backend. Um ein eigenes zu nutzen, passe die `supabaseUrl` und den `supabaseKey` in `services/supabase.ts` an.

### Google Gemini AI
Stelle sicher, dass dein `API_KEY` in deiner Umgebung oder als EAS Secret gesetzt ist, damit die Scan-Funktion funktioniert.

---
Erstellt mit ❤️ für iOS.
