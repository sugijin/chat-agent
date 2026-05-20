import type { Client, Message } from 'whatsapp-web.js';
import { askAgent } from './personalAgentClient';

const TRIGGER = '!ask ';

export async function handleMessage(_client: Client, message: Message): Promise<void> {
    const question = message.body.slice(TRIGGER.length).trim();
    if (!question) return;

    const chat = await message.getChat();

    // Fetch recent messages for context, then exclude the !ask message itself
    const allMessages = await chat.fetchMessages({ limit: 25 });
    const contextMessages = allMessages
        .filter(m => m.id._serialized !== message.id._serialized)
        .slice(-20);

    // Build a readable context string
    const context = contextMessages.map(m => {
        const sender = m.fromMe
            ? 'Me'
            : (m.author?.split('@')[0] ?? 'Other');
        const time = new Date(m.timestamp * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        return `[${time}] ${sender}: ${m.body}`;
    }).join('\n');

    const contact = chat.isGroup ? null : await chat.getContact();
    const chatName = chat.isGroup ? chat.name : (contact?.pushname || 'Direct Chat');

    await chat.sendStateTyping();

    try {
        const response = await askAgent(question, context, chatName);
        await message.reply(response);
    } finally {
        await chat.clearState();
    }
}
