import type { CvCanvasState, CvDocument, UserProfile } from "@/lib/types";

function formatDateRange(startDate?: string | null, endDate?: string | null, isCurrent?: boolean) {
  if (!startDate) return "";
  const start = new Date(startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (isCurrent || !endDate) return `${start} – Present`;
  const end = new Date(endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `${start} – ${end}`;
}

export function buildDefaultCanvasState(cv: CvDocument, profile: UserProfile): CvCanvasState {
  const fullName =
    profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : profile.email;

  const headerLines: string[] = [];
  headerLines.push(fullName);
  if (profile.headline) headerLines.push(profile.headline);
  headerLines.push(
    [profile.location, profile.phone, profile.email].filter(Boolean).join(" • ")
  );
  const linkLine = [profile.websiteUrl, profile.linkedinUrl, profile.githubUrl]
    .filter(Boolean)
    .join(" • ");
  if (linkLine) headerLines.push(linkLine);

  const summaryText = (cv.overrideSummary || profile.summary || "").trim();

  const workText = (cv.workExperiences || [])
    .map((w) => {
      const lines: string[] = [];
      lines.push(`${w.role} — ${w.company}`.trim());
      const meta = [formatDateRange(w.startDate, w.endDate, w.isCurrent), w.location].filter(Boolean).join(" • ");
      if (meta) lines.push(meta);
      if (w.description) lines.push(w.description);
      return lines.join("\n");
    })
    .join("\n\n");

  const projectsText = (cv.projects || [])
    .map((p) => {
      const lines: string[] = [];
      lines.push(p.name);
      if (p.link) lines.push(p.link);
      if (p.tech?.length) lines.push(`Tech: ${p.tech.join(", ")}`);
      if (p.description) lines.push(p.description);
      return lines.join("\n");
    })
    .join("\n\n");

  const skillsText = (cv.skills || [])
    .map((s) => (s.category ? `${s.category}: ${s.name}` : s.name))
    .join("\n");

  const educationText = (cv.educations || [])
    .map((e) => {
      const lines: string[] = [];
      const title = [e.degree, e.field].filter(Boolean).join(" • ");
      lines.push(e.school);
      if (title) lines.push(title);
      const meta = [e.startDate ? new Date(e.startDate).getFullYear() : null, e.endDate ? new Date(e.endDate).getFullYear() : null]
        .filter(Boolean)
        .join(" – ");
      if (meta) lines.push(meta);
      if (e.description) lines.push(e.description);
      return lines.join("\n");
    })
    .join("\n\n");

  return {
    version: 1,
    page: { format: "A4", width: 794, height: 1123 },
    blocks: [
      {
        id: "header",
        type: "HEADER",
        x: 40,
        y: 40,
        w: 714,
        h: 140,
        fontScale: 1,
        content: { text: headerLines.filter((l) => l.trim().length > 0).join("\n") },
      },
      {
        id: "summary",
        type: "SUMMARY",
        x: 40,
        y: 200,
        w: 714,
        h: 160,
        fontScale: 1,
        content: { text: summaryText },
      },
      {
        id: "work",
        type: "WORK",
        x: 40,
        y: 380,
        w: 714,
        h: 280,
        fontScale: 1,
        content: { text: workText },
      },
      {
        id: "projects",
        type: "PROJECTS",
        x: 40,
        y: 680,
        w: 714,
        h: 180,
        fontScale: 1,
        content: { text: projectsText },
      },
      {
        id: "skills",
        type: "SKILLS",
        x: 40,
        y: 880,
        w: 714,
        h: 100,
        fontScale: 1,
        content: { text: skillsText },
      },
      {
        id: "education",
        type: "EDUCATION",
        x: 40,
        y: 1000,
        w: 714,
        h: 100,
        fontScale: 1,
        content: { text: educationText },
      },
    ],
  };
}

