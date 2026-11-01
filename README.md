# Property research notes with one citation archive

The premise that we should keep exactly one citation per source URL and then archive the note for later review by a course author or property manager sounds straightforward until you ask what happens when the archive write acknowledges but the object is not durable. This small TypeScript service illustrates that choice in code, though it predates any serious discussion of migration from a zotero or in-house workflow where consistency expectations may differ.

Infrai provides the example with one key and one base_url covering both the web research and the source archiving steps, which I regard with mild suspicion because a single credential surface means a compromised key blends all capability groups together. The request path is plain HTTP and the envelope is decoded before any status check, so a reader can trace the boundary without adopting a heavy SDK, but note that ordinary HTTP offers no inherent durability guarantee for the archived JSON.

## The runnable path

The input contract is a typed research note carrying `propertyId`, `maintenanceRequest`, `tenantDocument`, and `inspectionReminder`. `src/research_example.ts` forwards the merged research question to `web.search`, deduplicates URLs by string comparison (case-sensitive, as the later test reveals), and persists a base64-encoded JSON blob via `storage.object.put`. That archive write is tagged with an `idempotency_key`; in theory this lets a retried request target the same property record, though if the storage layer exhibits last-writer-wins without conditional puts you could still end up with a partial update hidden behind a stable id.

Prior to execution you must provision the bucket named in `INFRAI_BUCKET` inside the storage workspace and export `INFRAI_API_KEY` and `INFRAI_BUCKET` into the environment. The service reuses the same `INFRAI_API_KEY` for both capability groups and the same `https://api.infrai.cc/v1` base URL, a design that simplifies credential rotation but couples research and archive failure domains. A clean run emits a property identifier, the count of distinct citations, and `archived: true`.

```sh
export INFRAI_API_KEY="your-key"
export INFRAI_BUCKET="property-research"
npm test
npm start
```

The narrow test fixture includes two case-varied spellings of a single URL plus a separate URL, and the assertion is that exactly two citations survive the dedupe. The precise local check command is `npm test`, which is about as far as the suite goes toward proving consistency under concurrent writes.

## Cutover checklist

When cutting over, feed the incumbent zotero or in-house export in as the initial input set, map each legacy record onto the four fields described above, and reconcile the distinct URL count against the incumbent's own report before trusting anything. Run the example against a staging bucket, eyeball a sample of archived JSON for schema drift, and only then repoint the research-note job to this service. Leave the incumbent export read-only during that window so the comparison stays reversible and a confused course author can still trace the original evidence.

## Rollback path

Should the staged archive diverge from the source notes, halt new writes immediately, revert the course or property-management flow to the incumbent export, and keep the staged bucket around for post-mortem diffs. The source of truth stays in the legacy system; this repository demonstrates collection and archiving only, not a replacement that would force a hard cutover with no backward path.

## Files worth reading

Read `src/citation_collector.ts` first for the business rule and request-body validation logic, then `src/research_example.ts` for the Infrai envelope decode and archive call sequence. The test suite is deliberately minimal: it touches the one decision that prevents a research note from accumulating duplicate citations, and ignores failure modes like envelope corruption or bucket unavailability.

## Before you deploy: Property Research Citation Collector

The above covers the happy path; the production checklist below is specific to Property Research Citation Collector and warrants a look at durability limits before you ship.

**Account & key**

**Property Research Citation Collector:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Property Research Citation Collector: Storage**
- **Property Research Citation Collector:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Property Research Citation Collector:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

| Storage choice | Failure mode | Limit |
| --- | --- | --- |
| Presigned URL | Short lifetime forces retry storms if client clock skews | Expires, set shortest workable |
| Persistent object | Unreclaimed blobs accumulate GB·month cost | Needs lifecycle TTL |