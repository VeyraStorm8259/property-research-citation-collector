export type ResearchNote = {
  propertyId: string;
  maintenanceRequest: string;
  tenantDocument: string;
  inspectionReminder: string;
};

export type Citation = {
  title: string;
  url: string;
  snippet: string;
};

export function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = citation.url.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validateResearchNote(value: unknown): ResearchNote {
  return researchNoteSchema.parse(value);
}

const researchNoteSchema = z.object({
  propertyId: z.string().min(1),
  maintenanceRequest: z.string().min(1),
  tenantDocument: z.string().min(1),
  inspectionReminder: z.string().min(1)
});

export function searchQuery(note: ResearchNote): string {
  return `${note.maintenanceRequest}; ${note.tenantDocument}; ${note.inspectionReminder}; property management research`;
}
import { z } from "zod";
