import type { AuthorizeFriend } from "./friendAccess";

const signInPath = "/friends-sign-in";

function destination(value: string | null, origin: string): string {
  const fallback = "/multiplayer";
  try {
    const url = new URL(value ?? fallback, origin);
    if (url.origin !== origin || url.pathname !== fallback) return fallback;
    const invite = url.searchParams.get("lobby");
    return invite && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(invite)
      ? fallback + "?lobby=" + invite
      : fallback;
  } catch {
    return fallback;
  }
}

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

const signInScript = `const button = document.querySelector("button");
const status = document.querySelector("[role=status]");
button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Opening Google…";
  const target = document.body.dataset.target;
  const callback = new URL(target, window.location.origin);
  const failure = new URL("/friends-sign-in", window.location.origin);
  failure.searchParams.set("next", target);
  failure.searchParams.set("failed", "1");
  try {
    const result = await fetch("/api/auth/sign-in/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google", callbackURL: callback.href, errorCallbackURL: failure.href }),
    });
    if (!result.ok) throw new Error("Sign-in could not start.");
    const { url } = await result.json();
    const provider = new URL(url);
    if (provider.protocol !== "https:" || provider.hostname !== "accounts.google.com") {
      throw new Error("Unexpected sign-in destination.");
    }
    window.location.assign(provider.href);
  } catch {
    status.textContent = "Google sign-in could not start. Try again.";
    button.disabled = false;
  }
});`;

export function createHostedFriendsAccess(origin: string, authorize: AuthorizeFriend) {
  return {
    async check(request: Request) {
      const session = await authorize(request.headers).catch(() => null);
      if (session) return new Response(null, { status: 204, headers: privateHeaders });
      const method = request.headers.get("x-forwarded-method");
      if (method === "GET" && request.headers.get("accept")?.includes("text/html")) {
        const link = new URL(signInPath, origin);
        link.searchParams.set("next", destination(request.headers.get("x-forwarded-uri"), origin));
        return new Response(null, { status: 302, headers: { ...privateHeaders, Location: link.href } });
      }
      return new Response("Friends-list access required.", { status: 401, headers: privateHeaders });
    },
    async signIn(request: Request) {
      const query = new URL(request.url).searchParams;
      const target = destination(query.get("next"), origin);
      if (await authorize(request.headers).catch(() => null)) {
        return new Response(null, { status: 302, headers: { ...privateHeaders, Location: new URL(target, origin).href } });
      }
      const message = query.has("failed") ? "This sign-in could not open the game. Check that your Google account is on the friends list." : "";
      // target contains only the fixed lobby path and, when present, a validated UUID.
      return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Grand Line Auto Chess</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a1c26;color:#ffefd2;font:1rem/1.55 system-ui,sans-serif}main{box-sizing:border-box;width:min(34rem,calc(100% - 2rem));padding:clamp(1.5rem,5vw,3rem);background:#142e38;border:1px solid #8f7450;border-radius:1rem}h1{margin:0;font:700 clamp(2rem,7vw,3rem)/1.05 Georgia,serif}button{min-height:44px;padding:.6rem 1rem;border:1px solid #f0c68a;border-radius:.5rem;background:#ebbb78;color:#241909;font:700 1rem system-ui,sans-serif;cursor:pointer}button:focus-visible{outline:2px solid #fff3d5;outline-offset:4px}button:disabled{opacity:.65}p{color:#d4dfe1}</style>
<script src="/friends-sign-in.js" defer></script></head>
<body data-target="${target}"><main><h1>Grand Line Auto Chess</h1><p>Sign in with an approved Google account to join the private game.</p>
<button type="button">Sign in with Google</button><p role="status">${message}</p><noscript>Google sign-in requires JavaScript.</noscript></main></body></html>`, {
        headers: {
          ...privateHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
          "Referrer-Policy": "no-referrer",
        },
      });
    },
    script() {
      return new Response(signInScript, { headers: { ...privateHeaders, "Content-Type": "text/javascript; charset=utf-8" } });
    },
  };
}
