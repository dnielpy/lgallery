import type { Metadata } from "next";
import { UploadContainer } from "@/src/modules/upload/containers/upload-container";

export const metadata: Metadata = {
  title: "Upload · LGallery",
  description: "Upload files to your local LGallery library.",
};

export default function UploadPage() {
  return <UploadContainer />;
}
