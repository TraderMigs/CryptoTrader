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

function extractRawPrivateKey(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN EC PRIVATE KEY-----/, "")
    .replace(/-----END EC PRIVATE KEY-----/, "")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  if (pem.includes("EC PRIVATE KEY")) {
    let i = 0;
    i++;
    if (der[i] & 0x80) {
      i += (der[i] & 0x7f) + 1;
    } else {
      i++;
    }
    i += 3;
    i += 2;
    return der.slice(i, i + 32);
  } else {
    for (let i = 0; i < der.length - 34; i++) {
      if (der[i] === 0x04 && der[i + 1] === 0x20) {
        return der.slice(i + 2, i + 34);
      }
    }
    throw new Error("Cannot find private key bytes in PEM");
  }
}

function wrapInPkcs8(rawKey: Uint8Array): ArrayBuffer {
  const pkcs8 = new Uint8Array([
    0x30, 0x41,
    0x02, 0x01, 0x00,
    0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27,
    0x30, 0x25,
    0x02, 0x01, 0x01,
    0x04, 0x20,
    ...rawKey,
  ]);
  return pkcs8.buffer;
}

async function buildCoinbaseJWT(method: string, path: string): Promise<string> {
  const keyName = Deno.env.get("COINBASE_API_KEY_NAME");
  const privateKeyPem = Deno.env.get("COINBASE_PRIVATE_KEY");

  if (!keyName || !privateKeyPem) {
    throw new Error("Missing COINBASE_API_KEY_NAME or COINBASE_PRIVATE_KEY");
  }

  const rawKey = extractRawPrivateKey(privateKeyPem);
  const pkcs8 = wrapInPkcs8(rawKey);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const uri = `${method} api.coinbase.com${path}`;

  const headerStr = JSON.stringify({
    alg: "ES256",
    kid: keyName,
    nonce: crypto.randomUUID().replace(/-/g, ""),
  });

  const payloadStr = JSON.stringify({
    iss: "cdp",
    nbf: now,
    exp: now + 120,
    sub: keyName,
    uri,
  });

  const enc = new TextEncoder();
  const h = toBase64url(enc.encode(headerStr));
  const p = toBase64url(enc.encode(payloadStr));
  const sigInput = `${h}.${p}`;

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    enc.encode(sigInput)
  );

  return `${sigInput}.${toBase64url(new Uint8Array(sig))}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const jwt = await buildCoinbaseJWT("GET", "/api/v3/brokerage/accounts");

    const response = await fetch(
      "https://api.coinbase.com/api/v3/brokerage/accounts",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Coinbase API error ${response.status}: ${await response.text()}`
      );
    }

    const data = await response.json();
    const accounts = data.accounts || [];

    let totalEquity = 0;
    for (const account of accounts) {
      totalEquity += parseFloat(account.available_balance?.value || "0");
    }

    const usdAccount = accounts.find(
      (a: { currency: string }) => a.currency === "USD"
    );
    const availableCash = parseFloat(
      usdAccount?.available_balance?.value || "0"
    );

    const { data: firstSnapshot } = await supabase
      .from("account_snapshots")
      .select("starting_balance")
      .order("snapshot_time", { ascending: true })
      .limit(1)
      .single();

    const startingBalance = firstSnapshot?.starting_balance ?? 100.0;
    const realizedPnl = totalEquity - startingBalance;

    await supabase.from("account_snapshots").insert({
      snapshot_time: new Date().toISOString(),
      starting_balance: startingBalance,
      current_balance: totalEquity,
      available_cash: availableCash,
      realized_pnl: realizedPnl,
      unrealized_pnl: 0,
      equity: totalEquity,
    });

    const { data: statsRow } = await supabase
      .from("public_stats_cache")
      .select("id")
      .limit(1)
      .single();

    if (statsRow) {
      const pnlPct =
        startingBalance > 0
          ? ((totalEquity - startingBalance) / startingBalance) * 100
          : 0;

      await supabase
        .from("public_stats_cache")
        .update({
          current_amount: totalEquity,
          starting_amount: startingBalance,
          realized_pnl: realizedPnl,
          pnl_pct: pnlPct,
          updated_at: new Date().toISOString(),
        })
        .eq("id", statsRow.id);
    }

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
        equity: totalEquity,
        available_cash: availableCash,
        realized_pnl: realizedPnl,
        snapshot_time: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        equity: totalEquity,
        available_cash: availableCash,
        realized_pnl: realizedPnl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
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
      .from("system_health")
      .select("id")
      .limit(1)
      .single();

    if (healthRow) {
      await supabase
        .from("system_health")
        .update({
          exchange_api_ok: false,
          latest_error: message,
          checked_at: new Date().toISOString(),
        })
        .eq("id", healthRow.id);
    }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
