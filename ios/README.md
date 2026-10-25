# Bindtopia voor iPhone

Native SwiftUI-app voor iOS 17+, zonder externe dependencies. Inclusief 23.736 Engelse kaartvermeldingen, lokaal zoeken, bewaren, camera/foto-keuze en lokale tekstherkenning met Apple Vision. Kaartdetails en afbeeldingen laden via TCGdex. Prijslinks openen de oorspronkelijke aanbieders.

## Openen en testen

1. Pak het archief uit op je Mac en open `Bindtopia.xcodeproj` in Xcode 16 of nieuwer.
2. Selecteer het target Bindtopia → Signing & Capabilities → jouw Apple Developer Team. Kies een uniek Bundle Identifier als `nl.bindtopia.app` niet beschikbaar is.
3. Selecteer je aangesloten iPhone (iOS 17+) en kies Run. Geef cameratoegang wanneer de app daarom vraagt. In de simulator gebruik je Kies foto.
4. Test met onder andere Charizard 4/102 en met kaarten uit andere sets. Controleer foto-oriëntatie, reflecties, OCR-fouten en afwijzen van cameratoegang. De match is altijd een suggestie; drukvariant, conditie en echtheid worden niet herkend.

## TestFlight en App Store

Maak na de toesteltest een Archive via Product → Archive en distribueer via App Store Connect. Vul vóór een App Store-inzending een appicoon, support-URL, privacybeleid, screenshots en App Privacy-antwoorden aan. De app verstuurt geen foto's of OCR-tekst; externe beeld- en datahosts ontvangen reguliere netwerkverzoeken. Controleer de rechten op de getoonde afbeeldingen voor distributie. Bewaarde kaarten zijn lokaal en synchroniseren nog niet met de webportal.

Dit project is in een Linux-omgeving gegenereerd. Xcode-compilatie, ondertekening en testen op een echte iPhone zijn hier niet uitgevoerd. Het is een ontwikkelversie, geen al geverifieerde App Store-build.

## Bronnen

Kaartgegevens: TCGdex, MIT-licentie in Resources/TCGDEX-LICENSE.txt. Snapshot: 23 oktober 2026. Afbeeldingen en Pokémon-merken blijven eigendom van hun respectieve rechthebbenden. Het project is geen officiële Pokémon-app.

## Privacyteksten

De app verwijst naar de privacyverklaring van de privéportal. De webverklaringen staan in `dist/privacy.html`, `cookies.html`, `voorwaarden.html` en `rechten.html`. Ze zijn concept totdat de beheerder en contactgegevens, hostingdetails en rechtenbasis zijn ingevuld. Publiceer bij App Store-distributie een zonder ChatGPT-login bereikbare definitieve privacy-URL en pas de link in CatalogView.swift aan.
