# Inbound Mail

## Goal

Divide receives only explicitly forwarded emails through an inbound webhook/API and stores them as actionable inbox items.

Privacy model:

- no mailbox polling
- no Outlook Graph
- no IMAP
- only emails explicitly POSTed to Divide are stored

## Database

Table:

- `inbound_mail`

Important fields:

- sender metadata
- original sender metadata
- subject
- text/html/stripped body
- attachments metadata JSON
- provider message id
- processed state
- optional raw payload

## Environment variables

```bash
VITE_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=8787
INBOUND_MAIL_SECRET=
```

`INBOUND_MAIL_SECRET` protects the inbound webhook route.

## API endpoints

- `POST /api/inbound-mail`
- `GET /api/inbound-mail/unprocessed`
- `GET /api/inbound-mail/{id}`
- `POST /api/inbound-mail/{id}/mark-processed`
- `POST /api/inbound-mail/{id}/create-task`

## Inbound security

The minimal supported flow is a shared bearer secret:

```http
Authorization: Bearer <INBOUND_MAIL_SECRET>
```

Provider-specific signature verification can be added later without changing the storage model.

## Example curl request

```bash
curl -X POST http://127.0.0.1:8787/api/inbound-mail \
  -H "Authorization: Bearer $INBOUND_MAIL_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "forward-email",
    "from_name": "anne",
    "from_email": "anne@bijanlab.nl",
    "to_email": "anne@bijanlab.nl",
    "original_from_name": "Bol.com",
    "original_from_email": "service@bol.com",
    "subject": "Bestelling verzonden",
    "text_body": "Volledige mailtekst",
    "html_body": "<p>Volledige mailtekst</p>",
    "stripped_text_body": "Pakket komt morgen binnen",
    "attachments_json": [],
    "message_id": "<example@provider>",
    "received_at": "2026-05-31T08:00:00.000Z",
    "raw_payload": { "provider": "forward-email" }
  }'
```

## Hermes / ANNE flow

1. call `GET /api/inbound-mail/unprocessed`
2. inspect each item
3. either:
   - call `POST /api/inbound-mail/{id}/mark-processed`
   - or call `POST /api/inbound-mail/{id}/create-task`

## Task creation behavior

Default task title:

- inbound mail subject

Default task description:

- sender
- received date
- stripped text body

Creating a task also marks the inbound mail item as processed.

## External provider model

Any external forwarding/webhook provider can POST into Divide as long as it:

- sends JSON
- includes the bearer secret
- maps provider payload fields into the supported endpoint shape
