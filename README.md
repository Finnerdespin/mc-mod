# Block Owner Guard (Bedrock)

Deze addon zorgt ervoor dat spelers alleen blokken kunnen breken die:
- door henzelf zijn geplaatst, of
- natuurlijk gegenereerd zijn (geen owner geregistreerd), of
- door iedereen als `/god` actief is.

## Commands

- `/userbecome <naam>`
  - Zet je "effectieve" gebruikersnaam op `<naam>`.
  - Voorbeeld: `/userbecome JanP` => je mag blokken breken die op naam van `JanP` staan.
- `/userbecome`
  - Reset naar je eigen naam.
- `/god`
  - Toggle god-mode voor jezelf; in god-mode mag je alle blokken breken.

## Werking

- Bij plaatsen van een blok slaat de script-engine de eigenaar op (op basis van je effectieve naam).
- Bij slopen van een blok:
  - geen eigenaar gevonden => toegestaan (natuurlijk gegenereerd / onbekend)
  - eigenaar = effectieve naam => toegestaan
  - anders => geblokkeerd

## Installatie

1. Plaats deze map als **behavior pack**.
2. Activeer de behavior pack in je world.
3. Zet **Beta APIs / Script API** aan als je versie dat vereist.
