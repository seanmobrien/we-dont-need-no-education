import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { onOutputGenerated } from '@/lib/ai/middleware/memory-middleware/direct-access/output-generated';
import { memoryClientFactory } from '@/lib/ai/mem0';
import { fromRequest } from '@/lib/auth/impersonation/impersonation-factory';
import { env } from '@repo/lib-site-util-env';

export const GET = wrapRouteRequest(async () => {
  const result = await onOutputGenerated({
    output: [
      { type: 'text', text: 'Chicago is a very windy city.' },
    ],
    params: {
      prompt: [
        { role: 'user', content: [{ type: 'text', text: 'I\'m going to Chicago next week' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'That will be nice!  It sounds like an important thing to remember.' }] },
        { role: 'user', content: [{ type: 'text', text: 'what will the weather be like?' }] },
        {
          role: 'assistant', content: [
            { type: 'tool-call', toolCallId: 'tool-1', toolName: 'weather', input: '{ \"city\": \"Chicago\" }' },
          ]
        },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'tool-1', toolName: 'weather', output: { type: 'text', value: '{ result: \"The weather in Chicago will be sunny\" }' } }] },
      ],
    },
    context: {
      memClient: await memoryClientFactory({
        defaults: {
          user_id: '3',
        },
      }),
      directAccess: true,
      mem0Enabled: true,
      impersonation: await fromRequest(),
      projectId: env('MEM0_PROJECT_ID') ?? undefined,
      organizationId: undefined,
      userId: '3',
      chatId: 'chat-123',
      messageId: 'message-123',
    }
  });
  return new Response(JSON.stringify(result));
})
