/**
 * Test the personal-agent service directly without WhatsApp.
 * Usage: node scripts/test-request.js "add a meeting with James on Friday at 2pm"
 */

require('dotenv').config();

const question = process.argv[2] ?? 'What is on my calendar today?';

async function main() {
  const url = `http://localhost:${process.env.PORT ?? 3001}/ask`;
  console.log(`\nSending to ${url}:\n  "${question}"\n`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.PERSONAL_AGENT_API_KEY,
    },
    body: JSON.stringify({
      question,
      context: '',
      chatName: 'Test',
    }),
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Reply:', data.reply ?? data.error);
}

main().catch(console.error);
