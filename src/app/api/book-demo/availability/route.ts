import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SLOTS = ["10:00","11:00","12:00","14:00","15:00","16:00"];
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";
const SLOT_DURATION_MS = 30 * 60 * 1000;

function parseServiceKey() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY");
  // Strip surrounding quotes (single or double) added for .env multiline safety
  const cleaned = raw.trim().replace(/^'([\s\S]*)'$/, "$1").replace(/^"([\s\S]*)"$/, "$1");
  return JSON.parse(cleaned);
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: parseServiceKey(),
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date", booked: [] }, { status: 400 });
  }

  const timeMin = `${date}T00:00:00Z`;
  const timeMax = `${date}T23:59:59Z`;

  try {
    const calendar = google.calendar({ version: "v3", auth: getAuth() });

    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });

    const events = res.data.items || [];

    const booked = SLOTS.filter(slot => {
      const [h, m] = slot.split(":").map(Number);
      const slotStart = new Date(`${date}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00Z`);
      const slotEnd   = new Date(slotStart.getTime() + SLOT_DURATION_MS);

      return events.some(e => {
        const eStart = new Date(e.start?.dateTime || e.start?.date || "");
        const eEnd   = new Date(e.end?.dateTime   || e.end?.date   || "");
        if (isNaN(eStart.getTime())) return false;
        return slotStart < eEnd && slotEnd > eStart;
      });
    });

    return NextResponse.json({ booked, date });
  } catch (e: any) {
    console.error("[availability]", e.message);
    return NextResponse.json({ error: e.message, booked: [] }, { status: 500 });
  }
}
