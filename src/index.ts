import 'dotenv/config';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { handleMessage } from './messageHandler';

const TRIGGER = '!ask ';

const processed = new Set<string>();

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-zygote',
            '--disable-gpu'
        ],
        ...(process.env.PUPPETEER_EXECUTABLE_PATH
            ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
            : {})
    }
});

client.on('qr', (qr) => {
    console.log('\n=== Scan this QR code with WhatsApp ===\n');
    qrcode.generate(qr, { small: true });
    console.log('\nRunning on a cloud server? View logs with: docker logs <container-name>\n');
});

client.on('authenticated', () => {
    console.log('Authenticated — session saved');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    process.exit(1);
});

client.on('ready', () => {
    const info = client.info;
    console.log(`\n✓ Connected as: ${info.pushname} (+${info.wid.user})`);
    console.log(`✓ Type "${TRIGGER}<question>" in any chat to ask the agent\n`);
});

client.on('disconnected', (reason) => {
    console.warn('Disconnected:', reason);
    process.exit(1);
});

async function dispatch(event: string, message: { fromMe: boolean; body: string; id: { _serialized: string } }) {
    console.log(`[DEBUG] ${event}: fromMe=${message.fromMe} id="${message.id._serialized}" body="${message.body.substring(0, 60)}"`);
    if (!message.fromMe) return;
    if (!message.body.toLowerCase().startsWith(TRIGGER.toLowerCase())) return;
    const msgId = message.id._serialized;
    if (processed.has(msgId)) {
        console.log(`[DEBUG] skipping duplicate msgId=${msgId}`);
        return;
    }
    processed.add(msgId);
    setTimeout(() => processed.delete(msgId), 60_000);
    console.log(`[DEBUG] dispatching msgId=${msgId}`);
    await handleMessage(client, message as Parameters<typeof handleMessage>[1]).catch(console.error);
}

client.on('message_create', (msg) => dispatch('message_create', msg));
client.on('message', (msg) => dispatch('message', msg));

client.initialize().catch((err) => {
    console.error('Failed to initialize:', err);
    process.exit(1);
});
