import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert bytes to base64url
function toBase64url(bytes: Uint8Array): string {
  let b64 = "";
  for (let i = 0; i < bytes.length; i++) {
    b64 += String.fromCharCode(bytes[i]);
  }
  return btoa(b64).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Extract raw 32-byte private key from SEC1 PEM (BEGIN EC PRIVATE KEY)
// SEC1 structure: SEQUENCE { version=1, OCTET STRING(key), [0]OID, [1]pubkey }
function extractRawPrivateKey(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN EC PRIVATE KEY-----/, "")
    .replace(/-----END EC PRIVATE KEY-----/, "")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  if (pem.includes("EC PRIVATE KEY")) {
    // SEC1 format: skip SEQUENCE header, skip version 02 01 01, then 04 20 + key
    let i = 0;
    i++; // skip 0x30 SEQUENCE tag
    if (der[i] & 0x80) {
      i += (der[i] & 0x7f) + 1;
    } else {
      i++;
    }
    i += 3; // skip 02 01 01 (version = 1)
    i += 2; // skip 04 20 (OCTET STRING header)
    return der.slice(i, i + 32);
  } else {
    // PKCS8 format: find 04 20 marker for SEC1 inner structure
    for (let i = 0; i < der.length - 34; i++) {
      if (
        der[i] === 0x04 &&
        der[i + 1] === 0x20 &&
        der[i - 1] === 0x01 &&
        der[i - 2] === 0x02
      ) {
        return der.slice(i + 2, i + 34);
      }
    }
    // Fallback: find any 04 20 sequence
    for (let i = 0; i < der.length - 34; i++) {
      if (der[i] === 0x04 && der[i + 1] === 0x20) {
        return der.slice(i + 2, i + 34);
      }
    }
    throw new Error("Cannot find private key bytes in PEM");
  }
}

// Wrap raw 32-byte P-256 private key in PKCS8 container for Web Crypto import
function wrapInPkcs8(rawKey: Uint8Array): ArrayBuffer {
  // PKCS8 for P-256 (no public key):
  // 30 41 - SEQUENCE (65 bytes)
  //   02 01 00 - version = 0
  //   30 13 - AlgorithmIdentifier SEQUENCE (19 bytes)
  //     06 07 2a 86 48 ce 3d 02 01 - OID id-ecPublicKey
  //     06 08 2a 86 48 ce 3d 03 01 07 - OID P-256
  //   04 27 - OCTET STRING (39 bytes)
  //     30 25 - SEC1 SEQUENCE (37 bytes)
  //       02 01 01 - version = 1
  //       04 20 - OCTET STRING (32 bytes)
  //         [32 bytes raw key]
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

// Build Coinbase JWT using Web Crypto (works with SEC1 PEM keys)
async function buildCoinbaseJWT(method: string, path: string): Promise<string> {
  const keyName = Deno.env.get("COINBASE_API_KEY_NAME");
  const privateKeyPem = Deno.env.get("COINBASE_PRIVATE_KEY");

  if (!keyName || !privateKeyPem) {
    throw new Error("Missing COINBASE_API_KEY_NAME or COINBASE_PRIVATE_KEY in secrets");
  }

  // Import key via Web Crypto
  const rawKey = extractRawPrivateKey(privateKeyPem);
  const pkcs8 = wrapInPkcs8(rawKey);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Build JWT
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

  // Deno Web Crypto returns IEEE P1363 format (raw R||S) — no DER conversion needed
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
    // Build JWT and call Coinbase
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
      const errorText = await response.text();
      throw new Error(`Coinbase API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const accounts = data.accounts || [];

    const usdAccount = accounts.find(
      (a: { currency: string }) => a.currency === "USD"
    );
    const usdBalance = usdAccount
      ? parseFloat(usdAccount.available_balance?.value || "0")
      : 0;

    // Log success
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
          checked_at: new Date().toISOString(),
          latest_error: null,
        })
        .eq("id", healthRow.id);
    }

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

    await supabase.from("audit_logs").insert({
      source: "coinbase-handshake",
      event_type: "api_connection_failed",
      severity: "error",
      payload_json: { error: message, tested_at: new Date().toISOString() },
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
