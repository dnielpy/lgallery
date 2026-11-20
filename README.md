# LGallery

LGallery is a private photo and video gallery for your home network. It scans one folder recursively and presents the media as a date-grouped, Google Photos-inspired timeline with an immersive viewer and local uploads.

## Features

- JPEG, PNG, WebP, GIF, MP4, and WebM libraries.
- Newest-first groups based on file modification time.
- Responsive justified rows and infinite loading.
- On-demand previews stored in a persistent cache.
- Photo zoom, pan, wheel, double-click, and touch gestures.
- Custom range-aware video player with seeking, volume, keyboard shortcuts, and full screen.
- Light and dark gallery themes.
- Drag-and-drop uploads with per-file progress, duplicate-safe names, and a root or new-subfolder destination.
- Album browsing based on direct subfolders, with the normal gallery and viewer inside each album.
- No database, edits, deletes, or exposed filesystem paths.

## Run with Docker Compose

Copy the environment example and set the absolute host path containing your media:

```bash
cp .env.example .env
```

```env
MEDIA_LIBRARY_HOST_PATH=/absolute/path/to/your/photos
```

Start LGallery:

```bash
docker compose up --build -d
```

Open `http://localhost:3000` on the host, or `http://<host-lan-ip>:3000` from another device on the same network. The source library is mounted read-write so `/upload` can store files. Generated previews live in the `lgallery-cache` Docker volume.

Open `/upload`, drag or choose one or more files, then select the library root, an existing album, or enter a new subfolder name. Existing files are never overwritten: LGallery adds a numeric suffix when a name is already present. Any file type can be stored, while only supported photo and video formats appear in the gallery.

> LGallery has no authentication. Keep port 3000 on a trusted LAN and do not expose it directly to the internet.

## Local development

Install dependencies and run Next.js with server-only environment variables:

```bash
pnpm install
MEDIA_LIBRARY_PATH=/absolute/path/to/your/photos \
MEDIA_CACHE_PATH=/absolute/path/to/a/writable/cache \
pnpm dev
```

Install `ffmpeg` locally to obtain real video metadata and posters. Images still work without it; videos retain a fallback poster and can still play when the browser supports their codec.

The library is rescanned on a fresh page load. Refresh the browser after adding, moving, or removing files. Hidden files and folders and symbolic links are ignored. The account running LGallery must have write permission on `MEDIA_LIBRARY_PATH` for uploads to work.

## Keyboard and viewer controls

- `Escape`: close the viewer.
- `Left` / `Right`: previous or next library item.
- `Space`: play or pause video.
- `J` / `L`: seek video backward or forward five seconds.
- `M`: mute or unmute video.
- Photos support wheel/pinch zoom, drag-to-pan, and double-click to toggle zoom.

## Validation

```bash
pnpm lint
pnpm test
pnpm build
docker compose build
```
