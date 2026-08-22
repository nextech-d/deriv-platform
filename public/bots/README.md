# Trading bot XML catalogs

Replace these files with your own bot packs:

- `standard-bots.xml` — Standard tier (Trading bots → Standard)
- `premium-bots.xml` — Premium tier (Trading bots → Premium)

Each pack lists `<bot id="..." />` entries. Optional per-bot overrides:

```xml
<bot id="my-bot" template="/bots/templates/my-bot.xml" />
```

Or inline Blockly XML:

```xml
<bot id="my-bot">
  <strategy><![CDATA[<?xml ... blockly ...]]></strategy>
</bot>
```

Per-bot files also work at `{tier}/{id}.xml` (e.g. `standard/poverty-sanitizer-ai.xml`).

Default templates live in `templates/standard-default.xml` and `templates/premium-default.xml`.
