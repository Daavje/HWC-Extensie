# HWC Dashboard Next ✦

Een vernieuwde, persoonlijke startpagina voor leerlingen van het Hermann Wesselink College. Gebaseerd op het idee van [HWC-Extensie](https://github.com/Daavje/HWC-Extensie), maar volledig opnieuw opgebouwd met een responsive dashboard en extra functies.

## Wat is nieuw?

- **Nieuwe-tabbladpagina** voor Chrome en Microsoft Edge (Manifest V3).
- **Automatisch Magister-rooster** via een eigen of vertrouwde [Magister Auth Gateway](https://github.com/Daavje/magister-auth-gateway): lessen, tijden, lokalen, docenten, lesinhoud en uitval (wanneer Magister deze gegevens levert).
- **Automatisch verversen:** bij openen indien nodig en elke 15 minuten op de achtergrond zolang de browser draait; tot vier weken rooster (vorige, huidige en twee komende weken).
- **Aanpasbare snelkoppelingen** (max. 12), standaard Magister, Outlook, Workspace365, ChatGPT, DeepL en YouTube. Links bewerken en verwijderen.
- **Takenlijst** met afvinken, belangrijke taken en filters.
- **Deadlines** op basis van taken met een datum; achterstallige deadlines worden getoond.
- **Persoonlijke notities** met automatisch lokaal opslaan.
- **Focustimer** met instelbare focus- en pauzeduur, pauzeren en hervatten. De tijd blijft doorlopen als je het tabblad sluit; bij heropenen zie je de resterende tijd.
- **Zoekbalk** met Google, DuckDuckGo of Bing. Sneltoetsen: `Ctrl+K` / `Cmd+K` en `/` om te zoeken, `N` om een taak toe te voegen.
- **Personalisatie:** je naam, lichte/donkere modus, accentkleur, 12/24-uursklok.
- **JSON-back-up** voor export/import van je taken, notities, links en instellingen.
- **Responsief en toegankelijk:** werkt ook op kleinere schermen, toetsenbordbediening, minder animatie bij `prefers-reduced-motion`.

> **Belangrijk:** Magister werkt na eenmalig instellen van een gateway en Managed Proxy Key. Dit is geen officiële Magister-integratie. De takenlijst blijft handmatig; eventuele lesinhoud uit Magister wordt **alleen bij de betreffende les** getoond. Cijfers worden niet opgehaald.

## Installatie (Chrome / Edge)

1. Download deze repository als ZIP en pak hem uit.
2. Open `chrome://extensions` (Chrome) of `edge://extensions` (Edge).
3. Zet **Ontwikkelaarsmodus** aan.
4. Klik op **Uitgepakte extensie laden** / **Load unpacked**.
5. Selecteer de uitgepakte map met `manifest.json`.
6. Open een nieuw tabblad. Klaar! Bij meerdere nieuw-tabbladextensies kan je browser vragen welke je wilt gebruiken.

**Bestaande extensie?** Schakel je oude HWC-extensie uit, omdat er maar één nieuw-tabbladvervanger tegelijk actief kan zijn. De instellingen uit versie 1 worden niet automatisch overgezet.

## Magister instellen (eenmalig)

Deze functie gebruikt de **Managed Proxy API Key** uit de [Magister Auth Gateway](https://github.com/Daavje/magister-auth-gateway). Je hoeft geen wachtwoord in de extensie in te voeren.

1. Zorg voor een **werkende gateway via HTTPS**. Gebruik een eigen installatie of uitsluitend een gateway waarvan je de beheerder vertrouwt. Een GitHub-repository op zichzelf is **geen** draaiende gateway.
2. Open het gateway-dashboard, meld je aan via de door de gateway ondersteunde Magister/Discipulus-authenticatie en maak een **Proxy Key** aan (`mag_sk_...`).
3. Open een nieuw tabblad met HWC Dashboard Next, klik bij **Mijn rooster → Koppelen**.
4. Vul de volledige gateway-origin in, bijvoorbeeld `https://gateway.voorbeeld.nl`, en plak de Proxy Key. Gebruik geen pad achter de domeinnaam.
5. Klik **Verbinden & ophalen** en geef je browser toestemming om dit specifieke domein te benaderen.
6. Als de gateway de Magister-API ondersteunt, verschijnen je afspraken automatisch. In de extensie kun je eerdere en komende weken bekijken en handmatig verversen.

**Werking:** de extensie doet via de gateway een GET-verzoek naar `/api/proxy/api/personen/me/afspraken?van=...&tot=...&status=1`. De sleutel gaat alleen als `Authorization: Bearer`-header naar de gekozen gateway. De gateway regelt het verversen van je Magister-tokens, mits die functie op je gateway is geconfigureerd. Voor ongeldige sleutels, offline gateways of gewijzigde API-endpoints verschijnt een foutmelding en blijft een eerder rooster zichtbaar.

**Geen gateway?** Dan blijft het dashboard gewoon bruikbaar voor taken, notities en andere functies, maar kan het geen live Magister-rooster ophalen. Een live verbinding met een echte leerlingaccount is niet automatisch getest door de unit-tests.

## Privacy en techniek

- Geen analytics, tracking, externe scripts of externe lettertypes.
- Browsermachtigingen: `storage`, `alarms`, `permissions`. Toegang tot websites is **optioneel** en wordt alleen aangevraagd voor de door jou ingevulde HTTPS-gateway.
- De Managed Proxy Key wordt apart in `chrome.storage.local` bewaard en **niet** meegenomen in de gewone JSON-export/import. Deel de sleutel nooit in een issue, screenshot of openbare repository.
- Je rooster wordt lokaal gecachet in `chrome.storage.local` zodat het ook bij een verbindingsfout zichtbaar kan blijven.
- Via **Instellingen → Ontkoppelen** verwijder je de sleutel en het gecachte rooster, en wordt de optionele websitetoestemming ingetrokken.
- Magister-gegevens worden rechtstreeks via je opgegeven gateway opgehaald; de beheerder van die gateway kan mogelijk toegang tot je schoolgegevens hebben. Gebruik een vertrouwde instantie.
- Taken, links, notities en instellingen worden lokaal opgeslagen en niet automatisch tussen apparaten gesynchroniseerd.
- Zoekopdrachten gaan pas naar de ingestelde zoekmachine nadat je zoekt.
- Maak regelmatig een back-up via **Instellingen → Exporteer gegevens**. Importeren vervangt bestaande dashboardinstellingen en taken, maar laat de Magister-koppeling ongemoeid.

## Projectstructuur

```
manifest.json        Manifest V3
index.html           Dashboard
styles.css           Responsive opmaak
app.js               Interface, Magister-roosterweergave en opslag
magister.js          Validatie, API-fetch en roosterparser
background.js        Automatisch verversen via Chrome alarms
lib.js               Validatie en gegevensmodel
popup.html           Kleine extensie-popup
icons/               PNG-iconen
tests/               Automatische tests
```

## Ontwikkeling en tests

Geen npm-installatie of bundler vereist. Vereist Node.js 20+ om de tests uit te voeren:

```bash
node --test tests/*.test.mjs
node --check app.js
node --check lib.js
node --check magister.js
node --check background.js
```

In deze repository staat de versie 2-code in de root. Publiceer je een Chrome Web Store-release, test dan eerst in Chrome en Edge en controleer de actuele storevereisten.

## Credits

Gebaseerd op het oorspronkelijke HWC-Extensie-project van [Daavje](https://github.com/Daavje). Onafhankelijk leerlingenproject; geen officieel product van HWC of Magister.
