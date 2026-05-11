import { AiSettingsForm } from "@/components/ai-settings-form";
import { RedmineSettingsForm } from "@/components/redmine-settings-form";

export default function SettingsPage() {
  return (
    <div className="w-full space-y-4">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">AI Model Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure provider, API key, model and prompt template for Deep Analysis.
        </p>
      </section>
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <AiSettingsForm />
      </section>
      <RedmineSettingsForm />
    </div>
  );
}
