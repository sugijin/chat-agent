import { google } from 'googleapis';

function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

function encodeEmail(to: string, subject: string, body: string): string {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

export async function createDraftEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<string> {
  const gmail = getGmailClient();
  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw: encodeEmail(args.to, args.subject, args.body) },
    },
  });
  return `Draft created (ID: ${res.data.id}) — To: ${args.to}, Subject: "${args.subject}"`;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<string> {
  const gmail = getGmailClient();
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodeEmail(args.to, args.subject, args.body) },
  });
  return `Email sent (ID: ${res.data.id}) — To: ${args.to}, Subject: "${args.subject}"`;
}
