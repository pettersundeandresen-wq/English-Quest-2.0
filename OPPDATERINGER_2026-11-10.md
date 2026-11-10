# English Quest 2.0 - oppdatert testversjon

Basert på repositoryet lastet opp 10. november 2026. Alle eksisterende grafikkfiler er beholdt.

## Endringer
- Flere åpne lysninger rundt oppdragsobjekter og innganger, uten å endre oppgave-ID-ene (0-179).
- To ekstra skogssnarveier og en smal passasje over hovedelven.
- Mer konsekvente skogsoner (bjork, gran, eik og blomstrende trar).
- Innendors utgangsdorer bruker eksisterende illustrerte dorer/portal i stedet for emoji.
- Innendors oppdragsobjekter bruker eksisterende PNG-illustrasjoner og statusikoner.
- Utvidet mobelbutikk med 30 kjopbare ting, dyrere priser og krav til husniva for luksus.
- Kjoepte mobler vises i hjemmet med PNG-grafikk. Automatisk, luftig plassering; fri dra-og-slipp-plassering er ikke implementert.
- Ferdige oppdrag ute kan besvares igjen for flere mestringsstjerner, opp til fem per verb.
- Fem-andre-verb-sperren gjelder pa tvers av oppgavetyper.
- Verdenskartet stanser bevegelse mens det er apent, og kan lukkes med Escape.

## Test og begrensninger
- JavaScript-syntaks kontrollert.
- Kartgenerator kontrollert: 124 utendors og 56 innendors oppgaver, alle 124 utendors oppgaver og 8 innganger tilgjengelige fra start i en rutebasert rutesoktest.
- 114 bildereferanser i graphics.js kontrollert mot eksisterende filer.
- Ingen full nettlesertest eller iPad-test er gjennomfort.
- Den nye grafikken er fortsatt en blanding av illustrerte og enkle innendors gulv/vegger.
- Gamle lagringsdata er ikke slettet; test gjerne med eksisterende fremgang og med ny testprofil.

## Oppdatering
Pakk ut ZIP og kopier innholdet (ikke toppmappen) til ditt lokale English-Quest-2.0-repository. Test med Live Server for Commit/Push.
