# LGallery

LGallery is a read-only photo and video gallery for your home network. It scans one folder recursively and presents the media as a date-grouped, Google Photos-inspired timeline with an immersive photo and video viewer.

## Features

- JPEG, PNG, WebP, GIF, MP4, and WebM libraries.
- Newest-first groups based on file modification time.
- Responsive justified rows and infinite loading.
- On-demand previews stored in a persistent cache.
- Photo zoom, pan, wheel, double-click, and touch gestures.
- Custom range-aware video player with seeking, volume, keyboard shortcuts, and full screen.
- Light and dark gallery themes.
- No database, uploads, edits, deletes, or exposed filesystem paths.

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

Open `http://localhost:3000` on the host, or `http://<host-lan-ip>:3000` from another device on the same network. The source library is mounted read-only. Generated previews live in the `lgallery-cache` Docker volume.

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

The library is rescanned on a fresh page load. Refresh the browser after adding, moving, or removing files. Hidden files and folders and symbolic links are ignored.

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
