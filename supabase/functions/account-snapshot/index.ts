import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toBase64url(bytes: Uint8Array): string {
  let b64 = "";
  for (let i = 0; i < bytes.length; i++) {
    b64 += String.fromCharCode(bytes[i]);
  }
  return btoa(b64).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function cleanBase64(raw: string): string {
  let s = raw.replace(/\\n/g, "\n");
  s = s.replace(/-----[A-Z\s]+-----/g, "");
  s = s.replace(/[^A-Za-z0-9+/=]/g, "");
  return s;
}

function extractJwkParts(rawPem: string): { d: string; x: string; y: string } {
  const b64 = cleanBase64(rawPem);
  if (!b64 || b64.length < 40) throw new Error(`Key base64 too short: ${b64.length} chars`);
  let der: Uint8Array;
  try {
    der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch (e) {
    throw new Error(`Base64 decode failed (len=${b64.length}): ${e}`);
  }
  let i = 0;
  if (der[i] !== 0x30) throw new Error(`Expected SEQUENCE`);
  i++;
  if (der[i] & 0x80) { i += (der[i] & 0x7f) + 1; } else { i++; }
  if (der[i] !== 0x02) throw new Error(`Expected INTEGER`);
  i += 3;
  if (der[i] !== 0x04) throw new Error(`Expected OCTET STRING`);
  i++;
  const dLen = der[i]; i++;
  const d = der.slice(i, i + dLen); i += dLen;
  if (i < der.length && der[i] === 0xa0) { const l = der[i + 1]; i += 2 + l; }
  if (der[i] !== 0xa1) throw new Error(`Expected [1] context`);
  i++; i++; i++; i++; i++; i++;
  const x = der.slice(i, i + 32);
  const y = der.slice(i + 32, i + 64);
  if (d.length === 0 || x.length !== 32 || y.length !== 32) throw new Error(`Bad key parts`);
  return { d: toBase64url(d), x: toBase64url(x), y: toBase64url(y) };
}

async function buildCoinbaseJWT(method: string, path: string): Promise<string> {
  const keyName = Deno.env.get("COINBASE_API_KEY_NAME");
  const privateKeyRaw = Deno.env.get("COINBASE_PRIVATE_KEY");
  if (!keyName || !privateKeyRaw) throw new Error("Missing COINBASE_API_KEY_NAME or COINBASE_PRIVATE_KEY");
  const { d, x, y } = extractJwkParts(privateKeyRaw);
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d, x, y, key_ops: ["sign"] },
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );
  const now = Math.floor(Date.now() / 1000);
  const uri = `${method} api.coinbase.com${path}`;
  const headerStr = JSON.stringify({ alg: "ES256", kid: keyName, nonce: crypto.randomUUID().replace(/-/g, "") });
  const payloadStr = JSON.stringify({ iss: "cdp", nbf: now, exp: now + 120, sub: keyName, uri });
  const enc = new TextEncoder();
  const h = toBase64url(enc.encode(headerStr));
  const p = toBase64url(enc.encode(payloadStr));
  const sigInput = `${h}.${p}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cryptoKey, enc.encode(sigInput));
  return `${sigInput}.${toBase64url(new Uint8Array(sig))}`;
}

async function fetchAllAccounts(): Promise<unknown[]> {
  const allAccounts: unknown[] = [];
  let cursor: string | null = null;
  do {
    const path = cursor
      ? `/api/v3/brokerage/accounts?limit=250&cursor=${cursor}`
      : `/api/v3/brokerage/accounts?limit=250`;
    const jwt = await buildCoinbaseJWT("GET", "/api/v3/brokerage/accounts");
    const response = await fetch(`https://api.coinbase.com${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`Coinbase API error ${response.status}: ${await response.text()}`);
    const data = await response.json();
    allAccounts.push(...(data.accounts || []));
    cursor = data.cursor && data.has_next ? data.cursor : null;
  } while (cursor);
  return allAccounts;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const accounts = await fetchAllAccounts();

    // Sum only USD-equivalent cash accounts
    let totalUsdValue = 0;
    let availableCash = 0;
    const cashCurrencies = new Set(["USD", "USDC", "USDT", "DAI"]);

    for (const account of accounts as Array<{
      currency: string;
      available_balance: { value: string };
      hold: { value: string };
    }>) {
      const value = parseFloat(account.available_balance?.value || "0");
      const holdValue = parseFloat(account.hold?.value || "0");
      const totalValue = value + holdValue;
      if (totalValue > 0 && cashCurrencies.has(account.currency)) {
        totalUsdValue += totalValue;
        availableCash += value;
      }
    }

    // Fallback: direct USD scan
    if (totalUsdValue === 0) {
      for (const account of accounts as Array<{
        currency: string;
        available_balance: { value: string };
      }>) {
        const value = parseFloat(account.available_balance?.value || "0");
        if (value > 0 && account.currency === "USD") {
          totalUsdValue += value;
          availableCash += value;
        }
      }
    }

    // Get starting balance — defaults to 50.01 only if NO snapshot exists at all
    const { data: firstSnapshot } = await supabase
      .from("account_snapshots")
      .select("starting_balance")
      .order("snapshot_time", { ascending: true })
      .limit(1)
      .single();

    const startingBalance = firstSnapshot?.starting_balance ?? 50.01;
    const realizedPnl = totalUsdValue - startingBalance;
    const pnlPct = startingBalance > 0
      ? ((totalUsdValue - startingBalance) / startingBalance) * 100
      : 0;

    // Write snapshot
    await supabase.from("account_snapshots").insert({
      snapshot_time: new Date().toISOString(),
      starting_balance: startingBalance,
      current_balance: totalUsdValue,
      available_cash: availableCash,
      realized_pnl: realizedPnl,
      unrealized_pnl: 0,
      equity: totalUsdValue,
    });

    // Update public stats cache
    const { data: statsRow } = await supabase
      .from("public_stats_cache")
      .select("id")
      .limit(1)
      .single();

    if (statsRow) {
      await supabase
        .from("public_stats_cache")
        .update({
          current_amount: totalUsdValue,
          starting_amount: startingBalance,
          realized_pnl: realizedPnl,
          pnl_pct: pnlPct,
          updated_at: new Date().toISOString(),
        })
        .eq("id", statsRow.id);
    }

    // Update system health
    const { data: healthRow } = await supabase
      .from("system_health")
      .select("id")
      .limit(1)
      .single();

    if (healthRow) {
      await supabase
        .from("system_health")
        .update({
          exchange_api_ok: true,
          worker_online: true,
          db_ok: true,
          checked_at: new Date().toISOString(),
          latest_error: null,
        })
        .eq("id", healthRow.id);
    }

    await supabase.from("audit_logs").insert({
      source: "account-snapshot",
      event_type: "snapshot_written",
      severity: "info",
      payload_json: {
        total_accounts_scanned: accounts.length,
        equity: totalUsdValue,
        available_cash: availableCash,
        realized_pnl: realizedPnl,
        snapshot_time: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_accounts_scanned: accounts.length,
        equity: totalUsdValue,
        available_cash: availableCash,
        realized_pnl: realizedPnl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from("audit_logs").insert({
      source: "account-snapshot",
      event_type: "snapshot_failed",
      severity: "error",
      payload_json: { error: message },
    });
    const { data: healthRow } = await supabase
      .from("system_health").select("id").limit(1).single();
    if (healthRow) {
      await supabase.from("system_health")
        .update({ exchange_api_ok: false, latest_error: message, checked_at: new Date().toISOString() })
        .eq("id", healthRow.id);
    }
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
