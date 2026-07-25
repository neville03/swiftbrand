import { MessagesSquare } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoon";

export function AIStrategyChatPage() {
  return (
    <ComingSoonPage
      icon={MessagesSquare}
      eyebrow="Strategy"
      title="AI Strategy Chat"
      description="An open chat with an AI that has full context on your Brand Foundation, past posts, and performance — ask it anything about your content strategy."
      bullets={[
        "Ask questions like \u201cwhat should I post about this week?\u201d",
        "Grounded in your real Brand Foundation and post history",
        "Suggests content pillars to double down on or retire",
        "Turns any answer directly into a Writing Assistant draft",
      ]}
    />
  );
}
