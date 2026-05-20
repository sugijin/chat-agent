import { askClaude } from './claudeClient';

const AGENT_URL = process.env.PERSONAL_AGENT_URL;
const AGENT_KEY = process.env.PERSONAL_AGENT_API_KEY;
const TIMEOUT_MS = 60_000;

export async function askAgent(
  question: string,
  context: string,
  chatName: string,
): Promise<string> {
  if (!AGENT_URL || !AGENT_KEY) {
    return askClaude(question, context, chatName);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${AGENT_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AGENT_KEY,
      },
      body: JSON.stringify({ question, context, chatName }),
      signal: controller.signal,
    });

    const data = await res.json() as { reply?: string; error?: string };
    return data.reply ?? data.error ?? 'No response from agent.';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Personal Agent unreachable, falling back to Claude:', message);
    return askClaude(question, context, chatName) + '\n_(personal agent offline)_';
  } finally {
    clearTimeout(timer);
  }
}
