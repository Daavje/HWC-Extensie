# HWC Dashboard Studio 3.0.0

Een grote update van de HWC Chrome- en Edge-extensie. Van eenvoudige startpagina naar een aanpasbaar dashboard.

## Nieuw

- **Snelkoppelingen en mappen:** tot 300 snelkoppelingen en 40 mappen, links verplaatsen en verslepen binnen een map.
- **Iconen naar keuze:** automatisch website-icon (favicon), ingebouwde emoji-iconenbibliotheek of een zelf geüploade afbeelding.
- **Bladwijzers importeren:** Chrome/Edge-bladwijzers overnemen. De extensie vraagt pas bij import om toestemming.
- **Integratiecatalogus:** snelle links naar 24 populaire diensten, waaronder Magister, Outlook, Microsoft Teams, Workspace365, Google Drive, ChatGPT, GitHub, Spotify en YouTube. *Dit zijn webkoppelingen, geen API-integraties.*
- **Nieuw popupvenster:** vanuit het extensieknopje snelkoppelingen en mappen openen, taken toevoegen en afvinken, de focustimer bedienen en komende lessen bekijken.
- **Persoonlijk uiterlijk:** eigen achtergrondafbeelding, instelbare accentkleur, lichte/donkere modus, compacte of grote tegels, animaties en zichtbaarheid van dashboardonderdelen.
- **Vernieuwd HWC-logo:** herkenbaar H-monogram met een nieuwe paarse stijl, ook als Chrome-extensie-icoon.

## Magister-rooster gerepareerd

Het rooster gebruikt nu het daadwerkelijk werkende beveiligde MCP-endpoint van de Magister Auth Gateway in plaats van de oude onjuiste route. De extensie verdeelt het vierweekse roosteroverzicht over twee toegestane verzoeken. Koppeling vereist een eigen HTTPS-gateway en een Managed Proxy Key.

## Installeren of updaten

1. Download hieronder **`HWC-Dashboard-Studio-v3.0.0.zip`** bij *Assets* en pak het ZIP-bestand uit.
2. Open `chrome://extensions` of `edge://extensions`.
3. Schakel **Ontwikkelaarsmodus** in.
4. Kies **Uitgepakte extensie laden** en selecteer de map waarin `manifest.json` staat.
5. Als je al een eerdere uitgepakte installatie hebt, werk dan die extensiemap bij en druk op **Opnieuw laden**. Schakel een oude afzonderlijke nieuw-tabbladextensie uit om conflicten te voorkomen.

**Opgelet:** de instellingen staan lokaal in de browser. Maak voor de zekerheid vóór een update een JSON-back-up via het dashboard. API-sleutels worden niet in die back-up opgenomen.

## Compatibiliteit en controle

- Chrome/Edge met Manifest V3 (Chrome 120+).
- Geautomatiseerde syntax-, unit- en extensiebestandstests zijn geslaagd.
- De nieuwe gebruikersinterface is nog niet volledig handmatig getest in een echte Chrome-installatie.
- Magister is een onofficiële koppeling en is afhankelijk van je eigen gateway.

Broncode: https://github.com/Daavje/HWC-Extensie
