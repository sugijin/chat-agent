import 'dotenv/config';
import express from 'express';
import { handleAgentRequest } from './agentHandler';
import { logToInbox, markInboxDone, logToLogs } from './notionLogger';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== process.env.PERSONAL_AGENT_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/ask', async (req, res) => {
  const { question, context, chatName } = req.body as {
    question: string;
    context: string;
    chatName: string;
  };

  if (!question) {
    res.status(400).json({ error: 'question is required' });
    return;
  }

  console.log(`[${new Date().toISOString()}] /ask — chat: "${chatName}" — question: "${question.slice(0, 80)}"`);

  const inboxId = await logToInbox(question, chatName);

  try {
    const result = await handleAgentRequest(question, context ?? '', chatName ?? 'Unknown');

    await Promise.all([
      markInboxDone(inboxId),
      logToLogs({
        question,
        reply: result.reply,
        agent: result.agent,
        category: result.category,
        outputSentTo: result.outputSentTo,
      }),
    ]);

    res.json({ reply: result.reply });
  } catch (err) {
    console.error('Agent error:', err);
    await markInboxDone(inboxId);
    res.status(500).json({ error: 'Agent failed', reply: 'Sorry, something went wrong. Please try again.' });
  }
});

const PORT = parseInt(process.env.PORT ?? '3001', 10);
app.listen(PORT, () => {
  console.log(`personal-agent listening on port ${PORT}`);
});
