import SettingsView from "@/components/SettingsView";
import { getSettings } from "@/server/settings.service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  
  // On passe les données réelles (sans le _id de mongo pour éviter les erreurs de sérialisation)
  const initialData = {
    whitelist: settings.whitelist || [],
    blacklist: settings.blacklist || [],
    rules: settings.rules || []
  };

  return <SettingsView initialData={initialData} />;
}
