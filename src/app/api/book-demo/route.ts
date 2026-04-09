import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Resend } from "resend";

const CALENDAR_ID      = process.env.GOOGLE_CALENDAR_ID || "primary";
const ADMIN_EMAIL      = process.env.DEMO_ADMIN_EMAIL   || "admin@decanschool.com";
const SLOT_DURATION_MS = 30 * 60 * 1000;
const VALID_SLOTS      = new Set(["10:00","11:00","12:00","14:00","15:00","16:00"]);

export const dynamic = "force-dynamic";

function parseServiceKey() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY");
  const cleaned = raw.trim().replace(/^'([\s\S]*)'$/, "$1").replace(/^"([\s\S]*)"$/, "$1");
  return JSON.parse(cleaned);
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: parseServiceKey(),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

function calcScore(role: string, size: string) {
  let s = 0;
  if (role === "owner")   s += 50;
  if (role === "admin")   s += 30;
  if (role === "teacher") s += 10;
  if (size === "500+")    s += 50;
  if (size === "100-500") s += 30;
  if (size === "0-100")   s += 10;
  return s;
}
function scoreLabel(score: number) {
  if (score >= 80) return { label: "🔥 HIGH",   color: "#ff3b30" };
  if (score >= 40) return { label: "⚡ MEDIUM", color: "#ff9f0a" };
  return              { label: "📋 LOW",    color: "#34c759" };
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const { name, email, school, role, size, date, time, timezone } = body;

  // Validate
  if (!name?.trim())                              return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email?.includes("@"))                      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  if (!school?.trim())                            return NextResponse.json({ error: "School name required" }, { status: 400 });
  if (!["owner","admin","teacher"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (!["0-100","100-500","500+"].includes(size))  return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  if (!VALID_SLOTS.has(time))                      return NextResponse.json({ error: "Invalid time slot" }, { status: 400 });

  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (dow === 0 || dow === 6) return NextResponse.json({ error: "Bookings only Mon–Fri" }, { status: 400 });

  const today = new Date(); today.setUTCHours(0,0,0,0);
  if (new Date(`${date}T00:00:00Z`) < today) return NextResponse.json({ error: "Cannot book a past date" }, { status: 400 });

  const [h, m] = time.split(":").map(Number);
  const slotStart = new Date(`${date}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00Z`);
  const slotEnd   = new Date(slotStart.getTime() + SLOT_DURATION_MS);

  try {
    const calendar = google.calendar({ version: "v3", auth: getAuth() });

    // Duplicate check — same slot
    const existing = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: slotStart.toISOString(),
      timeMax: slotEnd.toISOString(),
      singleEvents: true,
    });
    if ((existing.data.items || []).length > 0) {
      return NextResponse.json({ error: "This slot was just booked. Please pick another time." }, { status: 409 });
    }

    // Duplicate check — same email same day
    const dayEvents = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: `${date}T00:00:00Z`,
      timeMax: `${date}T23:59:59Z`,
      singleEvents: true,
      q: email,
    });
    if ((dayEvents.data.items || []).some(e => e.description?.includes(email))) {
      return NextResponse.json({ error: "You already have a demo booked on this day." }, { status: 409 });
    }

    // Create event — NO conferenceData (requires Workspace domain)
    // Meet link is generated via hangoutLink when calendar is a Google Workspace calendar
    const event = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `Demo — ${name} (${school})`,
        description: `Name: ${name}\nEmail: ${email}\nSchool: ${school}\nRole: ${role}\nSize: ${size}\nTimezone: ${timezone || "UTC"}`,
        start: { dateTime: slotStart.toISOString(), timeZone: "UTC" },
        end:   { dateTime: slotEnd.toISOString(),   timeZone: "UTC" },
      },
    });

    // hangoutLink is auto-added if the calendar owner has Meet enabled
    const meetLink = (event.data as any).hangoutLink || event.data.htmlLink || "";

    const score = calcScore(role, size);
    const { label, color } = scoreLabel(score);
    const dateLabel = slotStart.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric", timeZone:"UTC" });
    const timeLabel = `${time} UTC`;

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Admin email
    await resend.emails.send({
      from: "Decan School Demo <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `[${label}] New Demo — ${name} · ${school}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:16px">
        <h2 style="margin:0 0 4px;color:#0a0a0a">New Demo Booking</h2>
        <p style="margin:0 0 20px;color:#6e6e73;font-size:14px">Lead: <strong style="color:${color}">${label} (${score}pts)</strong></p>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          ${[["Name",name],["Email",email],["School",school],["Role",role],["Size",size+" students"],["Date",dateLabel],["Time",timeLabel],["Meet",meetLink?`<a href="${meetLink}">${meetLink}</a>`:"Will be in calendar invite"]].map(([k,v])=>`<tr><td style="padding:6px 0;color:#6e6e73;width:80px;font-size:12px;font-weight:600;text-transform:uppercase">${k}</td><td style="padding:6px 0;color:#0a0a0a;font-weight:500">${v}</td></tr>`).join("")}
        </table>
      </div>`,
    });

    // User email
    await resend.emails.send({
      from: "Decan School <onboarding@resend.dev>",
      to: email,
      subject: `Your demo is confirmed ✓`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:16px">
        <h2 style="margin:0 0 8px;color:#0a0a0a">You're confirmed, ${name.split(" ")[0]}! 🎉</h2>
        <p style="margin:0 0 20px;color:#6e6e73;font-size:14px">Your 30-minute Decan School demo is booked.</p>
        <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #e8e8ed">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0a0a0a">📅 ${dateLabel}</p>
          <p style="margin:0 0 16px;font-size:14px;color:#6e6e73">⏰ ${timeLabel} · 30 minutes</p>
          ${meetLink ? `<a href="${meetLink}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Join Meeting →</a>` : "<p style='color:#6e6e73;font-size:13px'>Meeting link will be in your calendar invite.</p>"}
        </div>
        <p style="font-size:13px;color:#6e6e73">See you soon!<br><strong style="color:#0a0a0a">The Decan School Team</strong></p>
      </div>`,
    });

    return NextResponse.json({ success: true, meetLink, date: dateLabel, time: timeLabel, eventId: event.data.id });

  } catch (e: any) {
    console.error("[book-demo]", e.message);
    return NextResponse.json({ error: e.message || "Booking failed. Please try again." }, { status: 500 });
  }
}
