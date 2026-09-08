import { CloudUpload, FolderOpen } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

export function UploadDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const dropFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={dropFiles}
      className={`relative grid min-h-72 place-items-center rounded-3xl border-2 border-dashed p-8 text-center transition sm:min-h-80 ${dragging ? "scale-[1.005] border-primary-blue bg-primary-soft" : "border-border bg-card hover:border-primary-blue/60 hover:bg-muted/30"}`}
    >
      <input ref={inputRef} type="file" multiple className="sr-only" onChange={selectFiles} aria-label="Choose files to upload" />
      <div className="pointer-events-none">
        <div className={`mx-auto grid size-20 place-items-center rounded-full transition ${dragging ? "bg-background text-primary-blue shadow-lg" : "bg-primary-soft text-primary-blue"}`}>
          <CloudUpload className="size-9" strokeWidth={1.8} />
        </div>
        <h2 className="mt-6 text-xl font-semibold tracking-[-0.02em]">{dragging ? "Drop files to continue" : "Drag files here"}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Upload photos, videos, or any other file to your library. You will choose the destination before uploading.</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="pointer-events-auto mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary-blue px-6 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <FolderOpen className="size-4" />
          Choose files
        </button>
      </div>
    </div>
  );
}
