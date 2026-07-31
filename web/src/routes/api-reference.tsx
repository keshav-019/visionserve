import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { CodeBlock, InlineCode } from "@/components/shared/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorCodes } from "@/mocks/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/api-reference")({
  head: () => ({
    meta: [
      { title: "API Reference — VisionServe" },
      {
        name: "description",
        content:
          "REST API reference for the VisionServe inference platform: authentication, endpoints, and error codes.",
      },
      { property: "og:title", content: "API Reference — VisionServe" },
      {
        property: "og:description",
        content: "REST API reference: authentication, endpoints, and error codes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApiReferencePage,
});

const ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/detect",
    description: "Run object detection on an image",
    scope: "inference:run",
  },
  {
    method: "POST",
    path: "/v1/ocr",
    description: "Extract text from an image",
    scope: "inference:run",
  },
  {
    method: "POST",
    path: "/v1/classify",
    description: "Classify an image into labels",
    scope: "inference:run",
  },
  {
    method: "POST",
    path: "/v1/jobs",
    description: "Submit an asynchronous inference job",
    scope: "jobs:write",
  },
  {
    method: "GET",
    path: "/v1/jobs/{id}",
    description: "Poll job status and progress",
    scope: "jobs:read",
  },
  {
    method: "POST",
    path: "/v1/batches",
    description: "Submit a batch of files for processing",
    scope: "batches:write",
  },
  {
    method: "GET",
    path: "/v1/batches/{id}",
    description: "Poll batch progress",
    scope: "jobs:read",
  },
  {
    method: "GET",
    path: "/v1/results/{id}",
    description: "Fetch a stored inference result",
    scope: "results:read",
  },
  {
    method: "GET",
    path: "/v1/models",
    description: "List registered models",
    scope: "models:read",
  },
  { method: "GET", path: "/v1/health", description: "Liveness and component status", scope: "—" },
] as const;

const curlExample = `curl -X POST https://api.visionserve.dev/v1/detect \\
  -H "Authorization: Bearer vs_live_…" \\
  -H "Content-Type: multipart/form-data" \\
  -F "image=@street.jpg" \\
  -F "confidence_threshold=0.25"`;

const jsExample = `import { VisionServe } from "@visionserve/sdk";

const client = new VisionServe({ apiKey: process.env.VISIONSERVE_API_KEY });

const result = await client.detect({
  image: fs.createReadStream("street.jpg"),
  confidenceThreshold: 0.25,
});

for (const det of result.detections) {
  console.log(det.label, det.confidence, det.box);
}`;

const pythonExample = `from visionserve import VisionServe

client = VisionServe(api_key=os.environ["VISIONSERVE_API_KEY"])

with open("street.jpg", "rb") as f:
    result = client.detect(image=f, confidence_threshold=0.25)

for det in result.detections:
    print(det.label, det.confidence, det.box)`;

const responseExample = `{
  "id": "res_9f2ac41d8e3b",
  "request_id": "req_7c1e0a94f2",
  "operation": "detect",
  "model": "detector-v1@1.4.0",
  "timing": {
    "decode_ms": 4.2,
    "preprocess_ms": 6.8,
    "inference_ms": 38.1,
    "postprocess_ms": 3.3,
    "total_ms": 52.4
  },
  "detections": [
    { "label": "car", "class_id": 2, "confidence": 0.94,
      "box": { "x": 812, "y": 402, "width": 236, "height": 158 } }
  ]
}`;

const methodColor: Record<string, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-amber-600 dark:text-amber-400",
  DELETE: "text-red-600 dark:text-red-400",
};

function ApiReferencePage() {
  const [tab, setTab] = useState("curl");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="API reference"
        description="Everything you need to call the inference API: authentication, endpoints, payloads, and errors."
      />

      <SectionCard title="Authentication">
        <p className="text-sm text-muted-foreground">
          Send your API key in the <InlineCode>Authorization</InlineCode> header as a Bearer token.
          Keys are environment-scoped: <InlineCode>vs_live_…</InlineCode> keys hit production,{" "}
          <InlineCode>vs_test_…</InlineCode> keys hit development and staging. Create and rotate
          keys on the API keys page.
        </p>
      </SectionCard>

      <SectionCard title="Quickstart" description="Run detection on an image in one request">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="js">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="pt-3">
            <CodeBlock code={curlExample} language="bash" />
          </TabsContent>
          <TabsContent value="js" className="pt-3">
            <CodeBlock code={jsExample} language="typescript" />
          </TabsContent>
          <TabsContent value="python" className="pt-3">
            <CodeBlock code={pythonExample} language="python" />
          </TabsContent>
          <TabsContent value="response" className="pt-3">
            <CodeBlock code={responseExample} language="json" title="200 OK" />
          </TabsContent>
        </Tabs>
      </SectionCard>

      <SectionCard title="Endpoints" description="Base URL: https://api.visionserve.dev">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Method</TableHead>
                <TableHead className="text-xs">Path</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Required scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ENDPOINTS.map((e) => (
                <TableRow key={`${e.method}-${e.path}`}>
                  <TableCell
                    className={cn("py-1.5 font-mono text-xs font-semibold", methodColor[e.method])}
                  >
                    {e.method}
                  </TableCell>
                  <TableCell className="py-1.5 font-mono text-xs">{e.path}</TableCell>
                  <TableCell className="py-1.5 text-xs text-muted-foreground">
                    {e.description}
                  </TableCell>
                  <TableCell className="py-1.5 font-mono text-[11px] text-muted-foreground">
                    {e.scope}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        title="Error codes"
        description="All errors return a JSON body with code, message, and request_id"
      >
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">HTTP</TableHead>
                <TableHead className="text-xs">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errorCodes.map((e) => (
                <TableRow key={e.code}>
                  <TableCell className="py-1.5 font-mono text-xs font-medium">{e.code}</TableCell>
                  <TableCell className="py-1.5 font-mono text-xs font-tnum">{e.http}</TableCell>
                  <TableCell className="py-1.5 text-xs text-muted-foreground">
                    {e.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
