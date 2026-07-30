import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseConfig, supabasePublishableKey, supabaseUrl } from "./config";

export function createClient() {
  if (!hasSupabaseConfig()) return null;
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
