import { createClient } from "@/lib/supabase/client";

// Settings keys mapping
export const SETTINGS_KEYS = {
  FROM_NAME: "sender.from_name",
  FROM_EMAIL: "sender.from_email",
  REPLY_TO: "sender.reply_to",
  DAILY_LIMIT: "limits.daily_limit",
  SEND_WINDOW_START: "schedule.send_window_start",
  SEND_WINDOW_END: "schedule.send_window_end",
  TIMEZONE: "schedule.timezone",
  FOOTER_COMPANY_NAME: "compliance.footer_company_name",
  FOOTER_ADDRESS: "compliance.footer_address",
} as const;

export interface AppSettings {
  from_name: string;
  from_email: string;
  reply_to: string;
  daily_limit: number;
  send_window_start: string;
  send_window_end: string;
  timezone: string;
  footer_company_name: string;
  footer_address: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  from_name: "Operator OS",
  from_email: "hello@marketing.operatoros.ai",
  reply_to: "",
  daily_limit: 50,
  send_window_start: "09:00",
  send_window_end: "17:00",
  timezone: "America/New_York",
  footer_company_name: "",
  footer_address: "",
};

// Get all settings as a typed object
export async function getSettings(): Promise<AppSettings> {
  const supabase = createClient();
  const { data } = await supabase.from("settings").select("key, value");

  const settings = { ...DEFAULT_SETTINGS };

  if (data) {
    for (const row of data) {
      const value = row.value;
      switch (row.key) {
        case SETTINGS_KEYS.FROM_NAME:
          settings.from_name = String(value);
          break;
        case SETTINGS_KEYS.FROM_EMAIL:
          settings.from_email = String(value);
          break;
        case SETTINGS_KEYS.REPLY_TO:
          settings.reply_to = String(value);
          break;
        case SETTINGS_KEYS.DAILY_LIMIT:
          settings.daily_limit = typeof value === "number" ? value : parseInt(String(value)) || 50;
          break;
        case SETTINGS_KEYS.SEND_WINDOW_START:
          settings.send_window_start = String(value);
          break;
        case SETTINGS_KEYS.SEND_WINDOW_END:
          settings.send_window_end = String(value);
          break;
        case SETTINGS_KEYS.TIMEZONE:
          settings.timezone = String(value);
          break;
        case SETTINGS_KEYS.FOOTER_COMPANY_NAME:
          settings.footer_company_name = String(value);
          break;
        case SETTINGS_KEYS.FOOTER_ADDRESS:
          settings.footer_address = String(value);
          break;
      }
    }
  }

  return settings;
}

// Save all settings
export async function saveSettings(settings: AppSettings): Promise<boolean> {
  const supabase = createClient();

  const settingsToSave = [
    { key: SETTINGS_KEYS.FROM_NAME, value: settings.from_name },
    { key: SETTINGS_KEYS.FROM_EMAIL, value: settings.from_email },
    { key: SETTINGS_KEYS.REPLY_TO, value: settings.reply_to },
    { key: SETTINGS_KEYS.DAILY_LIMIT, value: settings.daily_limit },
    { key: SETTINGS_KEYS.SEND_WINDOW_START, value: settings.send_window_start },
    { key: SETTINGS_KEYS.SEND_WINDOW_END, value: settings.send_window_end },
    { key: SETTINGS_KEYS.TIMEZONE, value: settings.timezone },
    { key: SETTINGS_KEYS.FOOTER_COMPANY_NAME, value: settings.footer_company_name },
    { key: SETTINGS_KEYS.FOOTER_ADDRESS, value: settings.footer_address },
  ];

  // Upsert each setting
  for (const setting of settingsToSave) {
    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: setting.key,
          value: setting.value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) {
      console.error(`Failed to save setting ${setting.key}:`, error);
      return false;
    }
  }

  return true;
}

// Get a single setting
export async function getSetting(key: string): Promise<unknown> {
  const supabase = createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();

  return data?.value;
}

// Set a single setting
export async function setSetting(key: string, value: unknown): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("settings")
    .upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  return !error;
}
