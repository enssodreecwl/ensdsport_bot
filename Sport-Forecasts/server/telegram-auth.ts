import crypto from "crypto";

interface TelegramInitData {
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  auth_date: number;
  hash: string;
  query_id?: string;
  start_param?: string;
}

/**
 * Validates Telegram Mini App init data
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string): TelegramInitData | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN not set, cannot validate init data");
    return null;
  }

  if (!initData) {
    return null;
  }

  try {
    // Parse the init data string
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    
    if (!hash) {
      return null;
    }

    // Remove hash from params and sort alphabetically
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Calculate secret key
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Calculate expected hash
    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Verify hash
    if (hash !== expectedHash) {
      console.warn("Invalid Telegram init data hash");
      return null;
    }

    // Check auth_date is not too old (1 hour)
    const authDate = parseInt(params.get("auth_date") || "0");
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 3600) {
      console.warn("Telegram init data expired");
      return null;
    }

    // Parse user data
    const userStr = params.get("user");
    const user = userStr ? JSON.parse(userStr) : undefined;

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: params.get("query_id") || undefined,
      start_param: params.get("start_param") || undefined,
    };
  } catch (error) {
    console.error("Error validating Telegram init data:", error);
    return null;
  }
}

/**
 * Extract user ID from validated init data
 */
export function getTelegramUserIdFromInitData(initData: string): string | null {
  const validated = validateTelegramInitData(initData);
  if (validated?.user?.id) {
    return validated.user.id.toString();
  }
  return null;
}
