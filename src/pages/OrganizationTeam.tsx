import { Users } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoon";

export function OrganizationTeamPage() {
  return (
    <ComingSoonPage
      icon={Users}
      eyebrow="Organization & Collaboration"
      title="Organization & Team"
      description="Scale from a solo founder brand to a multi-member creative team, with roles for photographers, designers, copywriters, and admins."
      bullets={[
        "Invite teammates and assign roles",
        "Shared Brand Foundation and Brand Kit across the workspace",
        "Per-role permissions (e.g. designers can't publish)",
        "Team billing and seat management",
      ]}
    />
  );
}
