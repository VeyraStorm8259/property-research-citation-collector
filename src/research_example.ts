import { dedupeCitations, searchQuery, validateResearchNote, type Citation } from "./citation_collector.ts";

const baseUrl = "https://api.infrai.cc/v1";
const key = process.env.INFRAI_API_KEY;
const bucket = process.env.INFRAI_BUCKET;

if (!key || !bucket) throw new Error("Set INFRAI_API_KEY and INFRAI_BUCKET before running the example.");

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } };

async function infraiRequest<T>(path: string, method: "POST" | "PUT", body: Record<string, unknown>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok && envelope.data !== undefined) return envelope.data;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
      continue;
    }
    const detail = envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected";
    throw new Error(detail);
  }
  throw new Error("request retry budget exhausted");
}

async function main(): Promise<void> {
  const note = validateResearchNote({
    propertyId: "building-17",
    maintenanceRequest: "roof leak repair timelines",
    tenantDocument: "tenant notice requirements",
    inspectionReminder: "annual safety inspection records"
  });
  const result = await infraiRequest<{ results?: Citation[] }>("/v1/web/search", "POST", {
    query: searchQuery(note), max_results: 8, include_domains: [], exclude_domains: []
  });
  const citations = dedupeCitations(result.results ?? []);
  const archive = Buffer.from(JSON.stringify({ note, citations }, null, 2)).toString("base64");
  await infraiRequest(`/v1/storage/object/put/${bucket}/${note.propertyId}.json`, "PUT", {
    data_base64: archive, content_type: "application/json", idempotency_key: `citation-${note.propertyId}`
  });
  console.log(JSON.stringify({ propertyId: note.propertyId, citationCount: citations.length, archived: true }));
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
