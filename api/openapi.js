export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Divide/Chores Life OS API',
    version: '1.0.0',
    description: 'Foundation API for tasks, people, life events, inbound mail, calendar sync, areas, knowledge, and briefings.',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/health': {
      get: {
        security: [],
        summary: 'Health check',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/tasks': {
      get: { summary: 'List tasks', responses: { '200': { description: 'Task list' } } },
      post: { summary: 'Create task', responses: { '201': { description: 'Task created' } } },
    },
    '/api/tasks/{id}': {
      patch: { summary: 'Update task', responses: { '200': { description: 'Task updated' } } },
      delete: { summary: 'Delete task', responses: { '204': { description: 'Task deleted' } } },
    },
    '/api/people': {
      get: { summary: 'List people', responses: { '200': { description: 'People list' } } },
      post: { summary: 'Create person', responses: { '201': { description: 'Person created' } } },
    },
    '/api/people/{id}': {
      patch: { summary: 'Update person', responses: { '200': { description: 'Person updated' } } },
    },
    '/api/life-events': {
      get: { summary: 'List life events', responses: { '200': { description: 'Life event list' } } },
      post: { summary: 'Create life event', responses: { '201': { description: 'Life event created' } } },
    },
    '/api/life-events/{id}': {
      patch: { summary: 'Update life event', responses: { '200': { description: 'Life event updated' } } },
    },
    '/api/areas': {
      get: { summary: 'List areas', responses: { '200': { description: 'Area list' } } },
      post: { summary: 'Create area', responses: { '201': { description: 'Area created' } } },
    },
    '/api/knowledge': {
      get: { summary: 'List knowledge entries', responses: { '200': { description: 'Knowledge list' } } },
      post: { summary: 'Create knowledge entry', responses: { '201': { description: 'Knowledge created' } } },
    },
    '/api/inbound-mail': {
      post: { security: [{ bearerAuth: [] }], summary: 'Receive inbound mail webhook payload', responses: { '201': { description: 'Inbound mail stored' } } },
    },
    '/api/inbound-mail/unprocessed': {
      get: { summary: 'List unprocessed inbound mail', responses: { '200': { description: 'Inbound mail list' } } },
    },
    '/api/inbound-mail/{id}': {
      get: { summary: 'Get one inbound mail item', responses: { '200': { description: 'Inbound mail item' } } },
    },
    '/api/inbound-mail/{id}/mark-processed': {
      post: { summary: 'Mark inbound mail processed', responses: { '200': { description: 'Inbound mail updated' } } },
    },
    '/api/inbound-mail/{id}/create-task': {
      post: { summary: 'Create task from inbound mail', responses: { '201': { description: 'Task created from inbound mail' } } },
    },
    '/api/calendar/sources': {
      get: { summary: 'List calendar sources', responses: { '200': { description: 'Calendar source list' } } },
    },
    '/api/calendar/events': {
      get: { summary: 'List calendar events', responses: { '200': { description: 'Calendar event list' } } },
    },
    '/api/calendar/upcoming': {
      get: { summary: 'List upcoming calendar events', responses: { '200': { description: 'Upcoming calendar events' } } },
    },
    '/api/calendar/today': {
      get: { summary: 'List today calendar events', responses: { '200': { description: 'Today calendar events' } } },
    },
    '/api/calendar/sync': {
      post: { summary: 'Run calendar sync', responses: { '200': { description: 'Calendar sync summary' } } },
    },
    '/api/briefing/today': {
      get: { summary: 'Build today briefing', responses: { '200': { description: 'Structured briefing payload' } } },
    },
  },
}

export function renderSwaggerUi(document) {
  const spec = JSON.stringify(document).replace(/</g, '\\u003c')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Divide/Chores API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      const spec = ${spec};
      window.ui = SwaggerUIBundle({ spec, dom_id: '#swagger-ui' });
    </script>
  </body>
</html>`
}
