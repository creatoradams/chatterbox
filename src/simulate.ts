/**
 * Injects fake chat messages into a running server for UI development.
 * Usage: npm run dev   (in one terminal)
 *        npm run simulate   (in another)
 */

const BASE = process.env.BASE_URL || "http://127.0.0.1:3847";

async function getAliases(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/api/profile`);
    const data = (await res.json()) as { profile?: { displayName?: string; aliases?: string[] } };
    const alias = data.profile?.aliases?.[0] || data.profile?.displayName || "yourname";
    return [alias];
  } catch {
    return ["yourname"];
  }
}

const samples = [
  { platform: "kick", username: "user91", text: "HYPE just different 👀" },
  { platform: "x", username: "user1337", text: "thanks for the polymarket picks 🔥" },
  { platform: "twitch", username: "user67", text: "Ansem is cooking again" },
  { platform: "kick", username: "kickfan", text: "lets goooo" },
  { platform: "twitch", username: "mod_user", text: "looking good today", badges: ["MOD"] },
] as const;

async function inject(): Promise<void> {
  const aliases = await getAliases();
  const mention = `@${aliases[0]} when is the next stream?`;

  const all = [
    ...samples,
    { platform: "twitch" as const, username: "viewer42", text: mention },
  ];

  for (let i = 0; i < all.length; i++) {
    const sample = all[i];
    const res = await fetch(`${BASE}/api/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...sample,
        id: `sim-${Date.now()}-${i}`,
        timestamp: Date.now(),
        badges: "badges" in sample ? sample.badges : undefined,
      }),
    });
    if (!res.ok) {
      console.error(`Simulate failed (${res.status}):`, await res.text());
      process.exit(1);
    }
    console.log(`Injected [${sample.platform}] ${sample.username}: ${sample.text}`);
    await new Promise((r) => setTimeout(r, 900));
  }
  console.log("Done.");
}

inject().catch((err) => {
  console.error(err);
  process.exit(1);
});
