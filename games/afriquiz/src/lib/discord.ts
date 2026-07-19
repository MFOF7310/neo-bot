import { DiscordSDK } from '@discord/embedded-app-sdk';
import type { GameUser } from '../types';

const CLIENT_ID =
  (import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined) ??
  '1505920607995564092';

/** Activities run inside Discord's proxy iframe on *.discordsays.com */
export function isInsideDiscord(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('discordsays.com');
}

let sdk: DiscordSDK | null = null;

/**
 * Full Embedded App SDK handshake:
 * ready() -> authorize() -> /neo/api/token (code exchange) -> authenticate()
 * Falls back to a demo user when running outside Discord (dev/preview).
 */
export async function initDiscord(): Promise<GameUser> {
  if (!isInsideDiscord()) {
    return {
      id: 'demo-user',
      username: 'DemoPlayer',
      avatar: null,
      locale: navigator.language || 'fr',
      guildId: 'demo-guild',
      isDemo: true,
    };
  }

  sdk = new DiscordSDK(CLIENT_ID);
  await sdk.ready();

  const { code } = await sdk.commands.authorize({
    client_id: CLIENT_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  const tokenRes = await fetch('/neo/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const auth = await sdk.commands.authenticate({ access_token });
  const user = auth.user;

  return {
    id: user.id,
    username: user.global_name ?? user.username,
    avatar: user.avatar ?? null,
    // locale is not in the SDK's public user type yet — read it defensively
    locale: (user as unknown as { locale?: string }).locale ?? 'en',
    guildId: sdk.guildId,
    isDemo: false,
  };
}

/** Resolve a display name for a participant in the current activity instance */
export async function resolveName(userId: string): Promise<string | null> {
  if (!sdk) return null;
  try {
    const res = await sdk.commands.getUser({ id: userId });
    if (!res) return null;
    return res.global_name ?? res.username ?? null;
  } catch {
    return null;
  }
}
