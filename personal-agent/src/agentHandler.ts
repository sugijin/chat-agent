import Anthropic from '@anthropic-ai/sdk';
import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { loadContext } from './contextLoader';
import { createCalendarEvent, listCalendarEvents } from './tools/calendar';
import { createDraftEmail, sendEmail } from './tools/gmail';
import { createNotionTask } from './tools/notion';

const anthropic = new Anthropic();

const TOOLS: Tool[] = [
  {
    name: 'create_calendar_event',
    description: 'Create an event in Jin\'s Google Calendar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: { type: 'string', description: 'Event title' },
        start_datetime: { type: 'string', description: 'Start in ISO 8601 format, e.g. 2026-05-21T14:00:00+08:00' },
        end_datetime: { type: 'string', description: 'End in ISO 8601 format' },
        description: { type: 'string', description: 'Event description (optional)' },
        location: { type: 'string', description: 'Event location (optional)' },
      },
      required: ['summary', 'start_datetime', 'end_datetime'],
    },
  },
  {
    name: 'list_calendar_events',
    description: 'List upcoming events in Jin\'s Google Calendar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        time_min: { type: 'string', description: 'Start of range in ISO 8601' },
        time_max: { type: 'string', description: 'End of range in ISO 8601' },
        max_results: { type: 'number', description: 'Maximum events to return (default 10)' },
      },
      required: ['time_min', 'time_max'],
    },
  },
  {
    name: 'create_draft_email',
    description: 'Create a draft email in Gmail. Use this by default — only use send_email if Jin explicitly says "send".',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body in plain text' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email via Gmail. Only use if Jin EXPLICITLY says to send — otherwise create a draft.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body in plain text' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'create_notion_task',
    description: 'Create a task in Jin\'s Notion Task Master database.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'Task description' },
        agent: {
          type: 'string',
          enum: ['Agent A Secretary', 'Agent B Finance', 'Agent C Corporate'],
          description: 'Which agent owns this task',
        },
        category: {
          type: 'string',
          enum: ['Daily Ops', 'Calendar', 'Finance', 'Health', 'Insurance', 'People', 'Career', 'Property', 'Corporate', 'Business'],
          description: 'Task category',
        },
        priority: { type: 'string', enum: ['Urgent', 'High', 'Normal', 'Low'] },
        due_date: { type: 'string', description: 'Due date in ISO 8601 (optional)' },
        output_channel: {
          type: 'string',
          enum: ['Gmail', 'Telegram', 'Google Calendar', 'Google Reminder', 'Notion Only'],
        },
      },
      required: ['task', 'agent', 'category'],
    },
  },
];

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'create_calendar_event':
      return createCalendarEvent(input as Parameters<typeof createCalendarEvent>[0]);
    case 'list_calendar_events':
      return listCalendarEvents(input as Parameters<typeof listCalendarEvents>[0]);
    case 'create_draft_email':
      return createDraftEmail(input as Parameters<typeof createDraftEmail>[0]);
    case 'send_email':
      return sendEmail(input as Parameters<typeof sendEmail>[0]);
    case 'create_notion_task':
      return createNotionTask(input as Parameters<typeof createNotionTask>[0]);
    default:
      return `Unknown tool: ${name}`;
  }
}

function classifyToolsUsed(toolNames: string[]): { agent: string; category: string; outputSentTo: string } {
  if (toolNames.includes('create_calendar_event') || toolNames.includes('list_calendar_events')) {
    return { agent: 'Agent A Secretary', category: 'Calendar', outputSentTo: 'Google Calendar' };
  }
  if (toolNames.includes('send_email') || toolNames.includes('create_draft_email')) {
    return { agent: 'Agent A Secretary', category: 'Daily Ops', outputSentTo: 'Gmail' };
  }
  if (toolNames.includes('create_notion_task')) {
    return { agent: 'Agent A Secretary', category: 'Daily Ops', outputSentTo: 'Notion Only' };
  }
  return { agent: 'Agent A Secretary', category: 'Daily Ops', outputSentTo: 'Notion Only' };
}

export interface AgentResult {
  reply: string;
  agent: string;
  category: string;
  outputSentTo: string;
}

export async function handleAgentRequest(
  question: string,
  context: string,
  chatName: string,
): Promise<AgentResult> {
  const myContext = await loadContext();

  const systemPrompt = `You are Jin's Personal AI Assistant, accessed via WhatsApp.

${myContext ? `--- JIN'S CONTEXT ---\n${myContext}\n--- END CONTEXT ---\n` : ''}

You have tools to take real actions: create calendar events, list calendar events, draft or send emails, and create Notion tasks.

IMPORTANT RULES:
- WhatsApp context: keep replies concise and conversational
- Default to create_draft_email — only use send_email if Jin explicitly says "send"
- Financial decisions: propose only, do not act without explicit approval
- When uncertain about intent, ask Jin before acting
- Today's date/time is ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })} (Singapore time, UTC+8)`;

  const userMessage = `WhatsApp chat: ${chatName}

Recent messages:
${context || '(no previous messages)'}

Request: ${question}`;

  const messages: MessageParam[] = [{ role: 'user', content: userMessage }];
  const toolsUsed: string[] = [];
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      const reply = textBlock?.type === 'text' ? textBlock.text : 'Done.';
      const classification = classifyToolsUsed(toolsUsed);
      return { reply, ...classification };
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          toolsUsed.push(block.name);
          let result: string;
          try {
            result = await executeTool(block.name, block.input as Record<string, unknown>);
          } catch (err) {
            result = `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  return {
    reply: 'I reached the maximum number of steps. Please try a simpler request.',
    agent: 'Agent A Secretary',
    category: 'Daily Ops',
    outputSentTo: 'Notion Only',
  };
}
