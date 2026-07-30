import "server-only";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseConfig, supabasePublishableKey, supabaseUrl } from "./config";

export async function createClient() {
  if (!hasSupabaseConfig()) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy refreshes the session.
        }
      },
    },
  });
}

export function createSecretClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secret) return null;
  return createAdminClient(supabaseUrl, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
