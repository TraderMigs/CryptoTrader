import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.15.4/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function buildCoinbaseJWT(method: string, path: string): Promise<string> {
  const keyName = Deno.env.get("COINBASE_API_KEY_NAME");
  const privateKeyPem = Deno.env.get("COINBASE_PRIVATE_KEY");

  if (!keyName || !privateKeyPem) {
    throw new Error("Missing COINBASE_API_KEY_NAME or COINBASE_PRIVATE_KEY");
  }

  const uri = `${method} api.coinbase.com${path}`;
  const now = Math.floor(Date.now() / 1000);

  const privateKey = await jose.importPKCS8(privateKeyPem, "ES256");

  const jwt = await new jose.SignJWT({
    iss: "cdp",
    nbf: now,
    exp: now + 120,
    sub: keyName,
    uri,
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: keyName,
      nonce: crypto.randomUUID().replace(/-/g, ""),
    })
    .sign(privateKey);

  return jwt;
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
    // Step 1: Fetch accounts from Coinbase
    const jwt = await buildCoinbaseJWT("GET", "/api/v3/brokerage/accounts");

    const response = await fetch("https://api.coinbase.com/api/v3/brokerage/accounts", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Coinbase API error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const accounts = data.accounts || [];

    // Step 2: Calculate total equity across all accounts
    let totalEquity = 0;
    for (const account of accounts) {
      const value = parseFloat(account.available_balance?.value || "0");
      totalEquity += value;
    }

    // USD cash available
    const usdAccount = accounts.find((a: { currency: string }) => a.currency === "USD");
    const availableCash = parseFloat(usdAccount?.available_balance?.value || "0");

    // Step 3: Get starting balance from bot_config context (first snapshot ever)
    const { data: firstSnapshot } = await supabase
      .from("account_snapshots")
      .select("starting_balance")
      .order("snapshot_time", { ascending: true })
      .limit(1)
      .single();

    const startingBalance = firstSnapshot?.starting_balance ?? 100.00;
    const realizedPnl = totalEquity - startingBalance;

    // Step 4: Write snapshot
    await supabase.from("account_snapshots").insert({
      snapshot_time: new Date().toISOString(),
      starting_balance: startingBalance,
      current_balance: totalEquity,
      available_cash: availableCash,
      realized_pnl: realizedPnl,
      unrealized_pnl: 0,
      equity: totalEquity,
    });

    // Step 5: Update public_stats_cache balance fields
    const { data: statsRow } = await supabase
      .from("public_stats_cache")
      .select("id, total_trades, wins, losses, win_rate")
      .limit(1)
      .single();

    if (statsRow) {
      const pnlPct = startingBalance > 0
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

    // Step 6: Update system health
    await supabase
      .from("system_health")
      .update({
        exchange_api_ok: true,
        worker_online: true,
        db_ok: true,
        checked_at: new Date().toISOString(),
        latest_error: null,
      })
      .eq("id", (await supabase.from("system_health").select("id").limit(1).single()).data?.id);

    // Step 7: Audit log
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

    await supabase
      .from("system_health")
      .update({
        exchange_api_ok: false,
        latest_error: message,
        checked_at: new Date().toISOString(),
      })
      .eq("id", (await supabase.from("system_health").select("id").limit(1).single()).data?.id);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
