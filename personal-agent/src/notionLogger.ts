import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function logToInbox(
  question: string,
  chatName: string,
): Promise<string> {
  try {
    const page = await notion.pages.create({
      parent: { database_id: process.env.NOTION_INBOX_DB_ID! },
      properties: {
        'Item': { title: [{ text: { content: question.slice(0, 100) } }] },
        'Source': { select: { name: 'WhatsApp' } },
        'Status': { select: { name: 'New' } },
        'Type': { select: { name: 'Task' } },
        'Date Captured': { date: { start: new Date().toISOString() } },
        'Notes': { rich_text: [{ text: { content: `Chat: ${chatName}` } }] },
      },
    });
    return page.id;
  } catch (err) {
    console.error('Failed to log to Inbox:', err);
    return '';
  }
}

export async function markInboxDone(pageId: string): Promise<void> {
  if (!pageId) return;
  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Status': { select: { name: 'Done' } },
      },
    });
  } catch (err) {
    console.error('Failed to update Inbox entry:', err);
  }
}

export async function logToLogs(data: {
  question: string;
  reply: string;
  agent: string;
  category: string;
  outputSentTo: string;
}): Promise<void> {
  try {
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_LOGS_DB_ID! },
      properties: {
        'Log Entry': { title: [{ text: { content: data.question.slice(0, 100) } }] },
        'Agent': { select: { name: data.agent } },
        'Category': { select: { name: data.category } },
        'Output Sent To': { select: { name: data.outputSentTo } },
        'Date Completed': { date: { start: new Date().toISOString() } },
        'Summary': { rich_text: [{ text: { content: data.reply.slice(0, 2000) } }] },
      },
    });
  } catch (err) {
    console.error('Failed to log to Logs:', err);
  }
}
