import type { CvCanvasBlock, CvCanvasBlockType, CvCanvasState, CvDocument, UserProfile } from "@/lib/types";
import { buildDefaultCanvasState } from "./buildDefaultCanvasState";

function formatDateRange(startDate?: string | null, endDate?: string | null, isCurrent?: boolean) {
  if (!startDate) return "";
  const start = new Date(startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (isCurrent || !endDate) return `${start} – Present`;
  const end = new Date(endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `${start} – ${end}`;
}

function sortByInclusionOrderThenDate<T extends { order?: number | null; startDate?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const ao = a.order ?? null;
    const bo = b.order ?? null;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;

    const ad = a.startDate ? new Date(a.startDate).getTime() : 0;
    const bd = b.startDate ? new Date(b.startDate).getTime() : 0;
    return bd - ad;
  });
}

function normalizeText(t: string | null | undefined) {
  return (t ?? "").replace(/\r\n/g, "\n");
}

function buildHeaderText(cv: CvDocument, profile: UserProfile) {
  // Keep in sync with buildDefaultCanvasState(), but duplicated here so we can selectively preserve an existing header.
  const fullName =
    profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : profile.email;

  const headerLines: string[] = [];
  headerLines.push(fullName);
  if (profile.headline) headerLines.push(profile.headline);
  headerLines.push([profile.location, profile.phone, profile.email].filter(Boolean).join(" • "));
  const linkLine = [profile.websiteUrl, profile.linkedinUrl, profile.githubUrl].filter(Boolean).join(" • ");
  if (linkLine) headerLines.push(linkLine);

  return headerLines.filter((l) => l.trim().length > 0).join("\n");
}

function buildSummaryText(cv: CvDocument, profile: UserProfile, existing?: string) {
  const t = (cv.overrideSummary ?? profile.summary ?? "").trim();
  if (t) return t;
  return (existing ?? "").trim();
}

function buildWorkText(cv: CvDocument) {
  const work = sortByInclusionOrderThenDate(cv.workExperiences || []);
  return work
    .map((w) => {
      const lines: string[] = [];
      lines.push(`${w.role} — ${w.company}`.trim());
      const meta = [formatDateRange(w.startDate, w.endDate, w.isCurrent), w.location].filter(Boolean).join(" • ");
      if (meta) lines.push(meta);
      if (w.description) lines.push(w.description);
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildProjectsText(cv: CvDocument) {
  const projects = [...(cv.projects || [])].sort((a, b) => {
    const ao = a.order ?? null;
    const bo = b.order ?? null;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    return a.name.localeCompare(b.name);
  });

  return projects
    .map((p) => {
      const lines: string[] = [];
      lines.push(p.name);
      if (p.link) lines.push(p.link);
      if (p.tech?.length) lines.push(`Tech: ${p.tech.join(", ")}`);
      if (p.description) lines.push(p.description);
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildSkillsText(cv: CvDocument) {
  const skills = [...(cv.skills || [])].sort((a, b) => {
    const ao = a.order ?? null;
    const bo = b.order ?? null;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    const ac = a.category ?? "";
    const bc = b.category ?? "";
    if (ac !== bc) return ac.localeCompare(bc);
    return a.name.localeCompare(b.name);
  });

  // If categories exist, group them for readability.
  const hasCategories = skills.some((s) => !!s.category);
  if (!hasCategories) {
    return skills
      .map((s) => {
        const level = s.level ? ` (${s.level})` : "";
        return `- ${s.name}${level}`;
      })
      .join("\n");
  }

  const byCategory = new Map<string, string[]>();
  for (const s of skills) {
    const cat = s.category || "Skills";
    const label = s.level ? `${s.name} (${s.level})` : s.name;
    byCategory.set(cat, [...(byCategory.get(cat) || []), label]);
  }

  return Array.from(byCategory.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, list]) => `${cat}: ${list.join(", ")}`)
    .join("\n");
}

function buildEducationText(cv: CvDocument) {
  const edu = [...(cv.educations || [])].sort((a, b) => {
    const ao = a.order ?? null;
    const bo = b.order ?? null;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    const ay = a.startDate ? new Date(a.startDate).getTime() : 0;
    const by = b.startDate ? new Date(b.startDate).getTime() : 0;
    return by - ay;
  });

  return edu
    .map((e) => {
      const lines: string[] = [];
      lines.push(e.school);
      const title = [e.degree, e.field].filter(Boolean).join(" • ");
      if (title) lines.push(title);
      const meta = [
        e.startDate ? new Date(e.startDate).getFullYear() : null,
        e.endDate ? new Date(e.endDate).getFullYear() : null,
      ]
        .filter(Boolean)
        .join(" – ");
      if (meta) lines.push(meta);
      if (e.description) lines.push(e.description);
      return lines.join("\n");
    })
    .join("\n\n");
}

function ensureAllBlockTypesExist(base: CvCanvasState, template: CvCanvasState) {
  const have = new Set(base.blocks.map((b) => b.type));
  const missing = template.blocks.filter((b) => !have.has(b.type));
  if (!missing.length) return base;
  return { ...base, blocks: [...base.blocks, ...missing] };
}

export function syncCanvasStateWithCvData(
  canvasState: CvCanvasState | null | undefined,
  cv: CvDocument,
  profile: UserProfile
): CvCanvasState {
  const template = buildDefaultCanvasState(cv, profile);
  const base = ensureAllBlockTypesExist(canvasState ?? template, template);

  const existingHeader = base.blocks.find((b) => b.type === "HEADER")?.content.text;
  const headerText = buildHeaderText(cv, profile);
  const summaryText = buildSummaryText(
    cv,
    profile,
    base.blocks.find((b) => b.type === "SUMMARY")?.content.text
  );

  const sectionText: Partial<Record<CvCanvasBlockType, string>> = {
    HEADER: headerText,
    SUMMARY: summaryText,
    WORK: buildWorkText(cv),
    PROJECTS: buildProjectsText(cv),
    SKILLS: buildSkillsText(cv),
    EDUCATION: buildEducationText(cv),
  };

  const blocks = base.blocks.map((b): CvCanvasBlock => {
    if (b.type === "HEADER" && canvasState) {
      // If there is already a saved canvasState, assume header text may have been customized.
      // Preserve it unless it is empty.
      if (normalizeText(existingHeader).trim().length > 0) return b;
    }
    const nextText = sectionText[b.type];
    if (nextText == null) return b;
    return {
      ...b,
      content: {
        ...b.content,
        text: normalizeText(nextText),
      },
    };
  });

  return { ...base, blocks };
}

