import { CodeBlock } from "./code-block";

export function JsonView({
  data,
  title = "response.json",
  maxHeight = 420,
}: {
  data: unknown;
  title?: string;
  maxHeight?: number;
}) {
  return <CodeBlock code={JSON.stringify(data, null, 2)} language="json" title={title} maxHeight={maxHeight} />;
}
