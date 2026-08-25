const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Vercel parses a JSON body automatically for standard content types,
    // but fall back to parsing manually just in case.
    const sub = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      res.status(400).json({ error: "Invalid subscription payload" });
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        },
        { onConflict: "endpoint" }
      );

    if (error) throw error;

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
