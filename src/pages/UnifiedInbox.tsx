import { Inbox } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoon";

export function UnifiedInboxPage() {
  return (
    <ComingSoonPage
      icon={Inbox}
      eyebrow="Unified Inbox"
      title="Comments, DMs & mentions in one place"
      description="Once your channels are connected, replies and mentions across LinkedIn, Instagram, X, and TikTok will land here so you never miss one."
      bullets={[
        "One feed for comments, DMs, and mentions across every channel",
        "AI-suggested replies drafted in your brand voice",
        "Flag high-priority messages (leads, press, partnerships)",
        "Assign messages to teammates once you invite your team",
      ]}
    />
  );
}
