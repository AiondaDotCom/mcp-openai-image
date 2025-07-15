# MCP OpenAI Image Server

## Projektbeschreibung
Dieses Projekt implementiert einen MCP (Model Context Protocol) Server für die OpenAI Bildgenerierung. Der Server ermöglicht es, über eine standardisierte Schnittstelle Bilder mit DALL-E zu generieren, zu bearbeiten und zu streamen.

## Entwicklungsumgebung einrichten

### Abhängigkeiten installieren
```bash
npm install
```

### TypeScript kompilieren
```bash
npm run build
```

### Entwicklungsserver starten
```bash
npm run dev
```

### Tests ausführen
```bash
npm test
```

### Test-Coverage erstellen
```bash
npm run test:coverage
```

## API-Konfiguration

### OpenAI API-Schlüssel konfigurieren
Die API-Konfiguration wird automatisch in `config/server-config.json` gespeichert. Diese Datei ist in `.gitignore` enthalten, um Sicherheit zu gewährleisten.

**Wichtig:** Sowohl der API-Schlüssel als auch die Organisations-ID sind für die Bildgenerierung erforderlich. Die Organisations-ID muss beim Konfigurieren des Servers angegeben werden.

### Standard-Modell
Das Projekt verwendet standardmäßig `gpt-4.1` für die Bildgenerierung, da dieses Modell bessere Ergebnisse liefert.

## Verfügbare Tools

1. **generate-image**: Generiert Bilder mit verschiedenen Parametern
2. **configure-server**: Konfiguriert OpenAI API-Schlüssel und Einstellungen
3. **edit-image**: Bearbeitet bestehende Bilder
4. **stream-image**: Generiert Bilder mit Streaming-Funktionalität
5. **get-config-status**: Überprüft den Konfigurationsstatus
6. **list-supported-models**: Listet unterstützte Modelle auf

## Unterstützte Parameter

- **Größen**: 1024x1024, 1024x1536, 1536x1024
- **Qualität**: low, medium, high, auto
- **Formate**: png, jpeg, webp
- **Hintergrund**: transparent, opaque, auto

## Fehlerbehebung

### Häufige Probleme
- **API-Schlüssel nicht konfiguriert**: Verwenden Sie `configure-server` Tool
- **Unbekannte Parameter**: Überprüfen Sie die unterstützten Parameter
- **Organisationsverifizierung**: Stellen Sie sicher, dass Ihre OpenAI-Organisation verifiziert ist

### Logging
Der Server protokolliert wichtige Ereignisse in der Konsole. Überprüfen Sie die Ausgabe auf Fehler oder Warnungen.

## Sicherheit

- API-Schlüssel werden lokal in `config/server-config.json` gespeichert
- Diese Datei ist in `.gitignore` enthalten und wird nicht versioniert
- Verwenden Sie niemals API-Schlüssel direkt im Code

## Deployment

### Produktionsserver starten
```bash
npm run build
npm start
```

### Als MCP-Server verwenden
Der Server kann als MCP-Server in kompatiblen Anwendungen verwendet werden.