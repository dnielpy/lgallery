// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createUploadQueueId, UploadView } from "@/src/modules/upload/upload-view";

type Listener = (event: ProgressEvent<EventTarget>) => void;

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];
  status = 0;
  responseText = "";
  headers = new Map<string, string>();
  listeners = new Map<string, Listener[]>();
  uploadListeners = new Map<string, Listener[]>();
  upload = {
    addEventListener: (type: string, listener: Listener) => {
      this.uploadListeners.set(type, [...(this.uploadListeners.get(type) ?? []), listener]);
    },
  };

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }

  open() {}
  send() {}
  abort() { this.emit("abort"); }
  setRequestHeader(name: string, value: string) { this.headers.set(name, value); }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener(new ProgressEvent(type));
  }
  emitProgress(loaded: number, total: number) {
    const event = new ProgressEvent("progress", { lengthComputable: true, loaded, total });
    for (const listener of this.uploadListeners.get("progress") ?? []) listener(event);
  }
}

const NativeXMLHttpRequest = globalThis.XMLHttpRequest;

beforeEach(() => {
  MockXMLHttpRequest.instances = [];
  globalThis.XMLHttpRequest = MockXMLHttpRequest as unknown as typeof XMLHttpRequest;
});

afterEach(() => {
  cleanup();
  globalThis.XMLHttpRequest = NativeXMLHttpRequest;
});

describe("UploadView", () => {
  it("creates queue IDs when randomUUID is unavailable on an insecure LAN origin", () => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: {} });
    expect(createUploadQueueId()).toMatch(/^upload-[a-z0-9]+-[a-z0-9]+$/);
    if (cryptoDescriptor) Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
  });

  it("asks for a destination and reports per-file progress", async () => {
    render(<UploadView />);
    const file = new File(["abcdefghij"], "holiday.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose files to upload"), { target: { files: [file] } });

    expect(await screen.findByRole("dialog")).toHaveTextContent("Choose a destination");
    fireEvent.click(screen.getByRole("button", { name: /New subfolder/ }));
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Summer" } });
    fireEvent.click(screen.getByRole("button", { name: "Start upload" }));

    await waitFor(() => expect(MockXMLHttpRequest.instances).toHaveLength(1));
    const request = MockXMLHttpRequest.instances[0];
    expect(request.headers.get("X-File-Name")).toBe("holiday.jpg");
    expect(request.headers.get("X-Folder-Name")).toBe("Summer");

    act(() => request.emitProgress(5, 10));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");

    request.status = 201;
    request.responseText = JSON.stringify({ fileName: "holiday.jpg", folderName: "Summer", size: 10 });
    act(() => request.emit("load"));
    await waitFor(() => expect(screen.getByText(/Uploaded ·/)).toBeInTheDocument());
  });
});
