import { deriveOutputs, type DerivedOutputsInput } from "@/app/hooks/derived-outputs-core";

interface WorkerRequest {
  readonly id: number;
  readonly input: DerivedOutputsInput;
}

interface WorkerResponse {
  readonly id: number;
  readonly output: ReturnType<typeof deriveOutputs>;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;
  const output = deriveOutputs(payload.input);
  const response: WorkerResponse = {
    id: payload.id,
    output,
  };
  (self as unknown as Worker).postMessage(response);
};
