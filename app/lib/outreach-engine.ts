export type OutreachDraft = {
  id: string;
  targetCategory: string;
  tier: "Tier 1: Cloud Partner" | "Tier 2: Track Partner" | "Tier 3: Ecosystem";
  subject: string;
  recipientRole: string;
  recipientEmail: string;
  organizerName: string;
  organizerContact: string;
  sponsorName?: string;
  body: string;
  callToAction: string;
  reviewed: boolean;
};

export type OutreachReviewResult = {
  eventName: string;
  draftsCount: number;
  drafts: OutreachDraft[];
  safetyPolicy: string;
  reviewedAt: string;
};

export function formatIndianCurrency(amount: number): string {
  const parts = Math.round(amount).toString();
  if (parts.length <= 3) return parts;
  const lastThree = parts.substring(parts.length - 3);
  const otherNumbers = parts.substring(0, parts.length - 3);
  return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
}

export type OutreachOptions = {
  organizerName?: string;
  organizerContact?: string;
  recipientEmail?: string;
  sponsorName?: string;
  duration?: string;
  isBudgetConfirmed?: boolean;
};

/**
 * Generates bespoke, professional outreach pitches tailored to the event parameters.
 * Uses real event details or explicit editable placeholders — never fabricates metrics or guarantees.
 */
export function generateOutreachDrafts(
  eventName: string,
  eventBrief = "",
  targetBudget = 0,
  participants = 0,
  options?: OutreachOptions
): OutreachReviewResult {
  const name = eventName.trim() || "[Event Name]";
  const studentCount = participants > 0 ? `${participants}+` : "[Participant Count Not Specified]";
  
  // Prize pool / budget claim: only state confirmed budget if confirmed, else explicit placeholder
  const isBudgetConfirmed = options?.isBudgetConfirmed ?? false;
  let budgetClaim = "[Budget / Prize Pool Not Confirmed]";
  if (targetBudget > 0) {
    budgetClaim = isBudgetConfirmed
      ? `confirmed ₹${formatIndianCurrency(targetBudget)} event budget`
      : `target budget of ₹${formatIndianCurrency(targetBudget)} (indicative, subject to confirmation)`;
  }

  // Duration placeholder / real value
  const durationStr = options?.duration?.trim() || "[Event Duration, e.g. 24–48 hours]";

  // Organizer and recipient fields
  const orgName = options?.organizerName?.trim() || "Lead Organizer";
  const orgContact = options?.organizerContact?.trim() || "[Your Contact Email]";
  const recipientEmail = options?.recipientEmail?.trim() || "[Partner DevRel Email]";
  const sponsorName = options?.sponsorName?.trim() || "Partner Team";

  const drafts: OutreachDraft[] = [
    {
      id: "draft-cloud-tier1",
      targetCategory: "Cloud Infrastructure & AI Platforms",
      tier: "Tier 1: Cloud Partner",
      subject: `Partnership Opportunity: ${name} — Empowering ${studentCount} AI Builders`,
      recipientRole: "Developer Relations / Startup Programs Lead",
      recipientEmail,
      organizerName: orgName,
      organizerContact: orgContact,
      sponsorName,
      body: `Dear Developer Relations Team at ${sponsorName},

I hope this email finds you well.

I am writing on behalf of the organizing team of ${name}, gathering ${studentCount} passionate developers, AI researchers, and builders.

Our participants will be building real-world intelligent systems and developer tools. We have planned a ${budgetClaim} and are seeking an official Cloud Partner to empower builders with platform credits and technical mentorship.

Proposed Tier 1 Cloud Partner Opportunities (to be tailored with your team):
• Keynote presentation slot during opening ceremony
• Opportunity for developer adoption of your platform APIs across participant projects
• Dedicated mentor lounge and optional attendee networking
• Prominent co-branding across digital banners, stage backdrops, and community channels

Would you be open to a brief 10-minute call this week to explore how we can spotlight your platform to our developer community?

Best regards,
${orgName}, ${name}
Contact: ${orgContact}`,
      callToAction: "Schedule 10-minute introductory partnership call",
      reviewed: false,
    },
    {
      id: "draft-track-tier2",
      targetCategory: "Developer Tools & API Infrastructure",
      tier: "Tier 2: Track Partner",
      subject: `Sponsor a Specialized Innovation Track at ${name}`,
      recipientRole: "Community & Developer Ecosystem Lead",
      recipientEmail,
      organizerName: orgName,
      organizerContact: orgContact,
      sponsorName,
      body: `Hi ${sponsorName} Team,

We are excited to host ${name}, bringing together ${studentCount} engineers for an intensive ${durationStr}.

We are designing challenge tracks and would love to propose a dedicated Innovation Track powered by your tooling. Your platform would be highlighted as the recommended infrastructure for teams competing in this category.

Proposed Track Partner Opportunities:
• Dedicated challenge bounty co-branded with your company
• Technical workshop or demo session during the schedule
• Direct product usage feedback from participating builder teams
• Community spotlight reaching participating tech clubs

We would love to share our sponsorship deck and discuss how we can tailor the challenge to your developer adoption goals.

Looking forward to connecting!

Warm regards,
${orgName}, ${name}
Contact: ${orgContact}`,
      callToAction: "Review track sponsorship deck & confirm challenge scope",
      reviewed: false,
    },
    {
      id: "draft-community-tier3",
      targetCategory: "Hardware & Swag Kits",
      tier: "Tier 3: Ecosystem",
      subject: `Community Partner Invitation: ${name}`,
      recipientRole: "Campus Evangelist / Developer Advocate",
      recipientEmail,
      organizerName: orgName,
      organizerContact: orgContact,
      sponsorName,
      body: `Hello ${sponsorName} Team,

We are gearing up for ${name} and want to make sure every builder receives an unforgettable experience with hands-on developer swags and tooling perks.

We are inviting select partners to contribute attendee swag box items, platform credits, or workshop merchandise. In return, we will feature your brand across our event platforms, website, and community reels.

Please let us know if your student advocacy or developer program can support us with stickers, merch, or perk codes.

Thanks so much,
${orgName}, ${name}
Contact: ${orgContact}`,
      callToAction: "Confirm swag box dispatch and attendee voucher codes",
      reviewed: false,
    },
  ];

  return {
    eventName: name,
    draftsCount: drafts.length,
    drafts,
    safetyPolicy:
      "All outreach emails are kept strictly in local draft mode. No emails or external messages are ever dispatched automatically without explicit human organizer confirmation.",
    reviewedAt: new Date().toISOString(),
  };
}
