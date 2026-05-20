import { google } from 'googleapis';

function getCalendarClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? 'primary';
const TIME_ZONE = 'Asia/Singapore';

export async function createCalendarEvent(args: {
  summary: string;
  start_datetime: string;
  end_datetime: string;
  description?: string;
  location?: string;
}): Promise<string> {
  const calendar = getCalendarClient();
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: args.summary,
      description: args.description,
      location: args.location,
      start: { dateTime: args.start_datetime, timeZone: TIME_ZONE },
      end: { dateTime: args.end_datetime, timeZone: TIME_ZONE },
    },
  });
  return `Event created: "${res.data.summary}" on ${res.data.start?.dateTime} (ID: ${res.data.id})`;
}

export async function listCalendarEvents(args: {
  time_min: string;
  time_max: string;
  max_results?: number;
}): Promise<string> {
  const calendar = getCalendarClient();
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: args.time_min,
    timeMax: args.time_max,
    maxResults: args.max_results ?? 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = res.data.items ?? [];
  if (events.length === 0) return 'No events found in that time range.';
  return events
    .map(e => `- ${e.summary} | ${e.start?.dateTime ?? e.start?.date}`)
    .join('\n');
}
