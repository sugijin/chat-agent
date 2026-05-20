import { Client } from '@notionhq/client';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

let cachedContext: string | null = null;

function blockToText(block: BlockObjectResponse): string {
  const type = block.type as string;
  const content = (block as Record<string, unknown>)[type] as Record<string, unknown> | undefined;
  if (!content) return '';

  if (Array.isArray(content['rich_text'])) {
    const prefix = type === 'bulleted_list_item' ? '• '
      : type === 'numbered_list_item' ? '- '
      : type === 'heading_1' ? '# '
      : type === 'heading_2' ? '## '
      : type === 'heading_3' ? '### '
      : '';
    const text = (content['rich_text'] as Array<{ plain_text: string }>)
      .map(rt => rt.plain_text).join('');
    return prefix + text;
  }
  return '';
}

export async function loadContext(): Promise<string> {
  if (cachedContext) return cachedContext;

  try {
    const blocks = await notion.blocks.children.list({
      block_id: process.env.NOTION_CONTEXT_PAGE_ID!,
      page_size: 100,
    });

    const text = blocks.results
      .filter((b): b is BlockObjectResponse => 'type' in b)
      .map(blockToText)
      .filter(Boolean)
      .join('\n');

    cachedContext = text;
    return text;
  } catch (err) {
    console.error('Failed to load My Context from Notion:', err);
    return '';
  }
}
