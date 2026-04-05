import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  const headers = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action, fingerprint_hash, components, bot_signals, behavior_metrics, email } = body;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") || "unknown";

    const jsonResponse = (data: any, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...headers, "Content-Type": "application/json" },
      });

    switch (action) {
      case "check_register": {
        if (bot_signals?.isBot) {
          return jsonResponse({ allowed: false, reason: "bot_detected" });
        }

        const { data } = await supabase.rpc("security_check_register", {
          p_fingerprint_hash: fingerprint_hash,
        });

        return jsonResponse(data || { allowed: true });
      }

      case "register_device": {
        const { user_id } = body;
        const { data } = await supabase.rpc("security_register_device", {
          p_fingerprint_hash: fingerprint_hash,
          p_user_id: user_id,
          p_components: components || {},
          p_ip_address: ip,
        });

        return jsonResponse(data || { success: true });
      }

      case "check_login": {
        if (bot_signals?.isBot) {
          return jsonResponse({ allowed: false, reason: "bot_detected" });
        }

        const { data } = await supabase.rpc("security_check_block_status", {
          p_fingerprint_hash: fingerprint_hash,
        });

        if (!data) {
          return jsonResponse({ allowed: true, remaining_attempts: 5 });
        }

        if (data.blocked) {
          return jsonResponse({
            allowed: false,
            reason: data.permanent ? "device_blocked" : "device_blocked",
            blocked_until: data.blocked_until,
            permanent: data.permanent || false,
            remaining_attempts: 0,
          });
        }

        return jsonResponse({
          allowed: true,
          remaining_attempts: data.remaining_attempts ?? 5,
        });
      }

      case "record_attempt": {
        const { success: loginSuccess } = body;

        const { data, error } = await supabase.rpc("security_record_login_attempt", {
          p_fingerprint_hash: fingerprint_hash,
          p_email: email || null,
          p_ip_address: ip,
          p_success: loginSuccess || false,
          p_user_agent: req.headers.get("user-agent") || "unknown",
        });

        if (error) {
          console.error("RPC security_record_login_attempt error:", error);
          return jsonResponse({ success: false, error: error.message }, 500);
        }

        return jsonResponse(data || { success: true, remaining_attempts: 5 });
      }

      case "check_block_status": {
        const { data, error } = await supabase.rpc("security_check_block_status", {
          p_fingerprint_hash: fingerprint_hash,
        });

        if (error) {
          console.error("RPC security_check_block_status error:", error);
          return jsonResponse({ blocked: false, remaining_attempts: 5, max_attempts: 5 });
        }

        return jsonResponse(data || { blocked: false, remaining_attempts: 5, max_attempts: 5 });
      }

      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("Auth security error:", error);
    const h = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...h, "Content-Type": "application/json" },
    });
  }
});
