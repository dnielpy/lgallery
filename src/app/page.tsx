import { GalleryContainer } from "@/src/modules/gallery/containers/gallery-container";
import { parseMediaQuery } from "@/src/modules/library/types";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  return <GalleryContainer query={parseMediaQuery(await searchParams)} />;
}
