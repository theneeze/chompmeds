const { createClient } = require("@supabase/supabase-js");
const webpush = require("web-push");
const { buildFirstNotification, buildNagNotification } = require("../lib/messages");

function getLocalParts(timeZone) {
  const now = new Date();

  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const weekdayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  });

  const dateStr = dateFmt.format(now); // YYYY-MM-DD
  const timeStr = timeFmt.format(now).replace(/^24:/, "00:"); // HH:MM
  const weekdayShort = weekdayFmt.format(now); // "Sun", "Mon", ...

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return { dateStr, timeStr, weekday: weekdayMap[weekdayShort] };
}

module.exports = async (req, res) => {
  try {
    // Light protection: since this is triggered by an external cron ping
    // rather than Vercel's own (authenticated) cron, require a shared
    // secret as a query param so the public URL can't be spammed.
    if (process.env.CRON_SECRET) {
      const providedKey = req.query && req.query.key;
      if (providedKey !== process.env.CRON_SECRET) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:example@example.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: settingsRow } = await supabase.from("settings").select("*").eq("id", 1).single();
    const timezone = (settingsRow && settingsRow.timezone) || "Europe/Rome";

    const { dateStr, timeStr, weekday } = getLocalParts(timezone);

    // 1. Create today's pending log rows for medicines due right now.
    const { data: dueMedicines, error: dueErr } = await supabase
      .from("medicines")
      .select("*")
      .eq("active", true)
      .eq("time", timeStr);

    if (dueErr) throw dueErr;

    for (const med of dueMedicines || []) {
      if (!med.days_of_week.includes(weekday)) continue;
      await supabase
        .from("logs")
        .upsert(
          {
            medicine_id: med.id,
            log_date: dateStr,
            scheduled_time: med.time,
            status: "pending"
          },
          { onConflict: "medicine_id,log_date", ignoreDuplicates: true }
        );
    }

    // 2. Load all not-yet-taken logs for today, with their medicine info.
    const { data: pendingLogs, error: logsErr } = await supabase
      .from("logs")
      .select("*, medicines(*)")
      .eq("log_date", dateStr)
      .neq("status", "taken");

    if (logsErr) throw logsErr;

    // 3. Load subscriptions once.
    const { data: subs } = await supabase.from("push_subscriptions").select("*");

    const toNotify = [];

    for (const log of pendingLogs || []) {
      const med = log.medicines;
      if (!med) continue;

      if (log.status === "pending") {
        toNotify.push({ log, med, kind: "first" });
      } else {
        const lastReminded = log.last_reminded_at ? new Date(log.last_reminded_at) : null;
        const nagMinutes = med.nag_interval_minutes || 15;
        const elapsedMinutes = lastReminded ? (Date.now() - lastReminded.getTime()) / 60000 : Infinity;
        if (elapsedMinutes >= nagMinutes) {
          toNotify.push({ log, med, kind: "nag" });
        }
      }
    }

    let sent = 0;

    for (const item of toNotify) {
      const { log, med, kind } = item;
      const payload =
        kind === "first"
          ? buildFirstNotification(med.name)
          : buildNagNotification(med.name, (log.reminder_count || 0) + 1);

      payload.medicineId = med.id;
      payload.sound = med.sound;

      const payloadStr = JSON.stringify(payload);

      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payloadStr
          );
          sent++;
        } catch (pushErr) {
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            console.error("push error", pushErr.statusCode, pushErr.body);
          }
        }
      }

      await supabase
        .from("logs")
        .update({
          status: kind === "first" ? "reminded" : "nagging",
          reminder_count: (log.reminder_count || 0) + 1,
          last_reminded_at: new Date().toISOString()
        })
        .eq("id", log.id);
    }

    res.status(200).json({ ok: true, checked: (pendingLogs || []).length, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
