import { CalendarClock } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoon";

export function CalendlyEventsPage() {
  return (
    <ComingSoonPage
      icon={CalendarClock}
      eyebrow="Event Content Engine"
      title="Calendly & Events"
      description="Connect Calendly so SwiftBrand can flag upcoming speaking gigs and launches, then generate a content shot list automatically."
      bullets={[
        "Sync your Calendly account to detect upcoming events",
        "Answer a few quick questions about tone and visual focus",
        "Get an auto-generated shot list for your media team",
        "Schedule before/during/after event content in one pass",
      ]}
    />
  );
}
