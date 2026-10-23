export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'TeachFlowAI API',
    version: '0.1.0',
    description:
      'Local API documentation for TeachFlowAI. API keys are used only for the request that supplies them and must never be stored or logged.',
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Check API availability',
        responses: { '200': { description: 'Service is healthy' } },
      },
    },
    '/api/lesson/create': {
      post: {
        summary: 'Create a grounded lesson from a PDF or text file',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'teacherPrompt'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  teacherPrompt: { type: 'string', maxLength: 3000 },
                  apiKey: {
                    type: 'string',
                    description: 'Optional per-request Gemini key.',
                  },
                  model: { type: 'string', example: 'gemini-3.5-flash-lite' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description:
              'Canonical client-held lesson state (response limited to 2 MiB).',
          },
          '400': { $ref: '#/components/responses/RequestError' },
          '401': { $ref: '#/components/responses/RequestError' },
          '413': { $ref: '#/components/responses/RequestError' },
          '422': { $ref: '#/components/responses/RequestError' },
          '429': { $ref: '#/components/responses/RequestError' },
          '502': { $ref: '#/components/responses/RequestError' },
        },
      },
    },
    '/api/lesson/chat': {
      post: {
        summary: 'Generate one streamed tutoring turn',
        description:
          'Returns server-sent events: delta, sources, progress, done, or error. JSON request body is limited to 3 MB.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lessonId', 'lessonState'],
                properties: {
                  lessonId: { type: 'string', format: 'uuid' },
                  lessonState: { type: 'object' },
                  conversationHistory: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                  message: { type: 'string' },
                  start: { type: 'boolean' },
                  apiKey: { type: 'string' },
                  model: { type: 'string', example: 'gemini-3.5-flash-lite' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Server-sent event stream',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
          },
          '400': { $ref: '#/components/responses/RequestError' },
          '401': { $ref: '#/components/responses/RequestError' },
          '413': { $ref: '#/components/responses/RequestError' },
        },
      },
    },
  },
  components: {
    responses: {
      RequestError: {
        description: 'Safe request or provider error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                    requestId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
