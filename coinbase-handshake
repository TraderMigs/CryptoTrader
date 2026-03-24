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
    throw new Error("Missing COINBASE_API_KEY_NAME or COINBASE_PRIVATE_KEY in secrets");
  }

  const uri = `${method} api.coinbase.com${path}`;
  const now = Math.floor(Date.now() / 1000);

  // Import EC private key from PEM
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
    // Step 1: Generate JWT for accounts endpoint
    const jwt = await buildCoinbaseJWT("GET", "/api/v3/brokerage/accounts");

    // Step 2: Call Coinbase API
    const response = await fetch("https://api.coinbase.com/api/v3/brokerage/accounts", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Coinbase API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Step 3: Find USD balance
    const accounts = data.accounts || [];
    const usdAccount = accounts.find(
      (a: { currency: string }) => a.currency === "USD"
    );
    const usdBalance = usdAccount
      ? parseFloat(usdAccount.available_balance?.value || "0")
      : 0;

    // Step 4: Log success to audit_logs
    await supabase.from("audit_logs").insert({
      source: "coinbase-handshake",
      event_type: "api_connection_success",
      severity: "info",
      payload_json: {
        usd_balance: usdBalance,
        total_accounts: accounts.length,
        tested_at: new Date().toISOString(),
      },
    });

    // Step 5: Update system_health
    await supabase
      .from("system_health")
      .update({
        exchange_api_ok: true,
        worker_online: true,
        checked_at: new Date().toISOString(),
        latest_error: null,
      })
      .eq("id", (await supabase.from("system_health").select("id").limit(1).single()).data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Coinbase API connection successful",
        usd_balance: usdBalance,
        total_accounts: accounts.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    // Log failure
    await supabase.from("audit_logs").insert({
      source: "coinbase-handshake",
      event_type: "api_connection_failed",
      severity: "error",
      payload_json: { error: message, tested_at: new Date().toISOString() },
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
