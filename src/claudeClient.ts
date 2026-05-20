import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a helpful AI assistant embedded in WhatsApp. The user asks you questions by typing "!ask" in any chat.

You have access to the recent conversation history so you can give context-aware help.

Guidelines:
- Be concise — this is a messaging app
- Use plain text; WhatsApp supports *bold*, _italic_, and ~strikethrough~
- Avoid markdown headers (##) and code fences unless truly necessary
- When asked about the conversation, refer to the messages shown in context
- Be direct and helpful`;

export async function askClaude(
    question: string,
    context: string,
    chatName: string
): Promise<string> {
    const response = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL ?? 'claude-opus-4-7',
        max_tokens: 1024,
        system: [
            {
                type: 'text',
                text: SYSTEM_PROMPT,
                cache_control: { type: 'ephemeral' }
            }
        ],
        messages: [
            {
                role: 'user',
                content: `Chat: ${chatName}

Recent messages:
${context || '(no previous messages)'}

Question: ${question}`
            }
        ]
    });

    const block = response.content.find(b => b.type === 'text');
    return block?.type === 'text' ? block.text : 'Sorry, I could not generate a response.';
}
