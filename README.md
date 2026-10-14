# HWC Dashboard Next ✦

Een vernieuwde, persoonlijke startpagina voor leerlingen van het Hermann Wesselink College. Gebaseerd op het idee van [HWC-Extensie](https://github.com/Daavje/HWC-Extensie), maar volledig opnieuw opgebouwd met een responsive dashboard en extra functies.

## Wat is nieuw?

- **Nieuwe-tabbladpagina** voor Chrome en Microsoft Edge (Manifest V3).
- **Aanpasbare snelkoppelingen** (max. 12), standaard Magister, Outlook, Workspace365, ChatGPT, DeepL en YouTube. Links bewerken en verwijderen.
- **Takenlijst** met afvinken, belangrijke taken en filters.
- **Deadlines** op basis van taken met een datum; achterstallige deadlines worden getoond.
- **Persoonlijke notities** met automatisch lokaal opslaan.
- **Focustimer** met instelbare focus- en pauzeduur, pauzeren en hervatten. De tijd blijft doorlopen als je het tabblad sluit; bij heropenen zie je de resterende tijd.
- **Zoekbalk** met Google, DuckDuckGo of Bing. Sneltoetsen: `Ctrl+K` / `Cmd+K` en `/` om te zoeken, `N` om een taak toe te voegen.
- **Personalisatie:** je naam, lichte/donkere modus, accentkleur, 12/24-uursklok.
- **JSON-back-up** voor export/import van je taken, notities, links en instellingen.
- **Responsief en toegankelijk:** werkt ook op kleinere schermen, toetsenbordbediening, minder animatie bij `prefers-reduced-motion`.

> **Belangrijk:** Deze versie haalt geen live roosters, cijfers of huiswerk uit Magister. De Magister-knop opent de officiële website; taken en deadlines voer je zelf in.

## Installatie (Chrome / Edge)

1. Download deze repository als ZIP en pak hem uit.
2. Open `chrome://extensions` (Chrome) of `edge://extensions` (Edge).
3. Zet **Ontwikkelaarsmodus** aan.
4. Klik op **Uitgepakte extensie laden** / **Load unpacked**.
5. Selecteer de uitgepakte map met `manifest.json`.
6. Open een nieuw tabblad. Klaar! Bij meerdere nieuw-tabbladextensies kan je browser vragen welke je wilt gebruiken.

**Bestaande extensie?** Schakel je oude HWC-extensie uit, omdat er maar één nieuw-tabbladvervanger tegelijk actief kan zijn. De instellingen uit versie 1 worden niet automatisch overgezet.

## Privacy en techniek

- Geen accounts, tracking, analytics, externe scripts of externe lettertypes.
- Alleen de Chrome/Edge-permissie `storage` is nodig.
- Taken, links, notities en instellingen worden opgeslagen met `chrome.storage.local` in je browserprofiel, **niet** doorgestuurd naar een server of automatisch gesynchroniseerd tussen apparaten.
- Er worden geen Magister-inloggegevens gelezen of opgeslagen.
- Zoekopdrachten worden pas naar de gekozen zoekmachine gestuurd als je op **Zoeken** drukt.
- Maak regelmatig een back-up via **Instellingen → Exporteer gegevens**; bij verwijderen van de extensie kunnen de gegevens verdwijnen.
- Importeer alleen vertrouwde JSON-back-ups. Importeren vervangt je huidige gegevens.

## Projectstructuur

```
manifest.json        Manifest V3
index.html           Dashboard
styles.css           Responsive opmaak
app.js               Interface en opslag
lib.js               Validatie en gegevensmodel
popup.html           Kleine extensie-popup
icons/               PNG-iconen
 tests/              Automatische tests
```

## Ontwikkeling en tests

Geen npm-installatie of bundler vereist. Vereist Node.js 20+ om de tests uit te voeren:

```bash
node --test tests/*.test.mjs
node --check app.js
node --check lib.js
```

In deze repository staat de versie 2-code in de root. Publiceer je een Chrome Web Store-release, test dan eerst in Chrome en Edge en controleer de actuele storevereisten.

## Credits

Gebaseerd op het oorspronkelijke HWC-Extensie-project van [Daavje](https://github.com/Daavje). Onafhankelijk leerlingenproject; geen officieel product van HWC of Magister.
