import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Handles email-link auth flows by exchanging the `code` in the URL for a session.
 * This is required for:
 * - email confirmation links
 * - password recovery links
 */
export function AuthCallbackHandler() {
  useEffect(() => {
    const url = new URL(window.location.href);

    const code = url.searchParams.get("code");
    // Supabase also sometimes uses these params; keep them for potential debugging UX elsewhere.
    const hasAuthError = url.searchParams.has("error") || url.searchParams.has("error_description");

    if (!code || hasAuthError) return;

    let cancelled = false;

    (async () => {
      // Exchange the auth code for a session (PKCE)
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (cancelled) return;

      // Always clean the URL to prevent repeated exchanges on refresh.
      // Keep non-auth params like `type=recovery` for ResetPassword page.
      url.searchParams.delete("code");
      url.searchParams.delete("code_verifier");
      url.searchParams.delete("redirect_to");

      // Some providers include these on success; remove for cleanliness.
      url.searchParams.delete("token_hash");
      url.searchParams.delete("access_token");
      url.searchParams.delete("refresh_token");
      url.searchParams.delete("expires_in");
      url.searchParams.delete("expires_at");
      url.searchParams.delete("provider_token");
      url.searchParams.delete("provider_refresh_token");

      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);

      // If there was an error exchanging, leave the app to show normal auth UI.
      if (error) {
        // Intentionally no console logging of sensitive values.
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
