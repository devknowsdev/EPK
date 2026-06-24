# EPK to Focus Packet Export

Last-Updated: 2026-06-24

## Purpose

The EPK publisher can generate an `epk-to-focus.event-packet` JSON payload for `prism-focus`.

This is a proposal/export path. It is not direct sync.

## Where it lives

Open the hosted or local publisher, then go to:

```text
Promo brief → Focus task packet
```

The panel is injected by:

```text
EPK/public/publisher/publisher-focus-packet.js
```

## Workflow

1. Fill in the Promo brief event fields:
   - Event name
   - Date
   - Venue
   - City
   - CTA / ticket link
   - Audience mode
2. Click **Generate Focus packet**.
3. Copy or download the generated JSON.
4. Open `prism-focus`.
5. Use the Focus inbox/import button.
6. Paste the JSON.
7. Review/select tasks before importing.

## Safety boundary

The EPK publisher does not:

- send the packet to Focus
- create Focus tasks
- sync in the background
- watch files
- publish the packet automatically
- require a GitHub token for packet export

EPK proposes tasks. Focus reviews and imports selected tasks.

## Generated task types

The default generated packet proposes:

- poster task
- social announcement task
- press/venue blurb task
- event detail confirmation task
- post-gig follow-up task

Dates are derived from the event date where possible.

## Schema target

The packet targets Beam's draft schema:

```text
epk-to-focus.event-packet
```

Required top-level shape:

- `schemaVersion`
- `packetType`
- `source`
- `review`
- `event`
- `tasks`

## Future work

Possible next improvements:

- let Dave edit generated task templates before copying
- include travel/admin windows
- support multiple event presets
- add a local smoke-test fixture packet
