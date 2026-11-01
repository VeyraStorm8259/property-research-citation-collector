import { dedupeCitations } from "../src/citation_collector.ts";

const citations = dedupeCitations([
  { title: "A", url: "https://example.test/guide", snippet: "one" },
  { title: "A copy", url: " HTTPS://EXAMPLE.TEST/guide ", snippet: "duplicate" },
  { title: "B", url: "https://example.test/checklist", snippet: "two" }
]);

if (citations.length !== 2 || citations[1].title !== "B") {
  throw new Error("the citation decision must keep one record per source URL");
}
console.log("citation dedupe decision: passed");
