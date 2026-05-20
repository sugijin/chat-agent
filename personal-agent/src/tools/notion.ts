import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function createNotionTask(args: {
  task: string;
  agent: 'Agent A Secretary' | 'Agent B Finance' | 'Agent C Corporate';
  category: string;
  priority?: 'Urgent' | 'High' | 'Normal' | 'Low';
  due_date?: string;
  output_channel?: string;
}): Promise<string> {
  const properties: Record<string, unknown> = {
    'Task': { title: [{ text: { content: args.task } }] },
    'Agent': { select: { name: args.agent } },
    'Category': { select: { name: args.category } },
    'Priority': { select: { name: args.priority ?? 'Normal' } },
    'Status': { select: { name: 'To Do' } },
  };

  if (args.due_date) {
    properties['Due Date'] = { date: { start: args.due_date } };
  }
  if (args.output_channel) {
    properties['Output Channel'] = { select: { name: args.output_channel } };
  }

  await notion.pages.create({
    parent: { database_id: process.env.NOTION_TASK_MASTER_DB_ID! },
    properties: properties as Parameters<typeof notion.pages.create>[0]['properties'],
  });

  return `Task created in Task Master: "${args.task}" — assigned to ${args.agent}`;
}
