# Trading bot XML catalogs

Your bot strategies live here:

| Tier | Catalog | Strategy XML |
|------|---------|--------------|
| **Standard** | `standard-bots.xml` | `templates/standard-default.xml` ← **poverty sanitizer Ai** |
| **Premium** | `premium-bots.xml` | `templates/premium-default.xml` ← **kasongo Ai** |

Replace `templates/standard-default.xml` or `templates/premium-default.xml` to update the whole tier.

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
