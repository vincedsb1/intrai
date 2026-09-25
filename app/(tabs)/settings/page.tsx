import SettingsView from "@/components/SettingsView";
import { getSettings } from "@/server/settings.service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  // Seules les propriétés consommées par le client sont transmises.
  const initialData = {
    whitelist: settings.whitelist || [],
    blacklist: settings.blacklist || [],
    rules: settings.rules || [],
    deduplicateCrossRegion: settings.deduplicateCrossRegion || false
  };

  return <SettingsView initialData={initialData} />;
}
