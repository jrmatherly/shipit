/**
 * Input Validators for Plugin Marketplace Operations
 *
 * Strict allowlist-based validation for all values that become subprocess
 * arguments or HTTP request parameters. Defense-in-depth against injection.
 */

const PLUGIN_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_PLUGIN_NAME_LENGTH = 100;
const VALID_SCOPES = ['user', 'project', 'local'] as const;
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function validatePluginId(name: string): string {
  if (!name || name.length > MAX_PLUGIN_NAME_LENGTH || !PLUGIN_NAME_REGEX.test(name)) {
    throw new Error(
      `Invalid plugin ID: must be 1-${MAX_PLUGIN_NAME_LENGTH} characters matching [a-zA-Z0-9_-]`
    );
  }
  return name;
}

export function validateMarketplaceUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid marketplace URL: ${urlString}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid URL scheme: ${url.protocol} (only http: and https: allowed)`);
  }

  const isLocalhost = LOCALHOST_HOSTNAMES.has(url.hostname);
  if (url.protocol === 'http:' && !isLocalhost) {
    throw new Error('HTTP is only allowed for localhost URLs. Use HTTPS for remote hosts.');
  }

  return url;
}

export function validateScope(scope: string): 'user' | 'project' | 'local' {
  if (!(VALID_SCOPES as readonly string[]).includes(scope)) {
    throw new Error(`Invalid scope: ${scope} (must be one of: ${VALID_SCOPES.join(', ')})`);
  }
  return scope as 'user' | 'project' | 'local';
}
