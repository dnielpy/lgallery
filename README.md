# LGallery

LGallery is a private photo and video gallery for your home network. It scans one folder recursively and presents the media as a date-grouped, Google Photos-inspired timeline with an immersive viewer and local uploads.

## Features

- JPEG, PNG, WebP, GIF, MP4, and WebM libraries.
- Newest-first groups based on file modification time.
- Responsive justified rows and infinite loading.
- On-demand previews stored in a persistent cache.
- Photo zoom, pan, wheel, double-click, and touch gestures.
- The same video player as LocalTube: drag-to-seek bar, playback speed, double-tap seeking, keyboard shortcuts, and full screen on phones too.
- Light and dark gallery themes.
- Drag-and-drop uploads with per-file progress, duplicate-safe names, and a root or new-subfolder destination.
- Album browsing based on direct subfolders, with the normal gallery and viewer inside each album.
- A user and password to open it; the session lasts 30 days.
- No database, edits, deletes, or exposed filesystem paths.

## Run with Docker Compose

Copy the environment example and set the absolute host path containing your media:

```bash
cp .env.example .env
```

```env
APP_PORT=3000
MEDIA_LIBRARY_HOST_PATH=/absolute/path/to/your/photos
LGALLERY_USERNAME=admin
LGALLERY_PASSWORD=*PasswordSafe
```

`LGALLERY_USERNAME` (default `admin`) and `LGALLERY_PASSWORD` are what the sign-in page asks for. Change the
password from the example: changing either one signs everyone out.

Start LGallery:

```bash
docker compose up --build -d
```

Open `http://localhost:3000` on the host, or `http://<host-lan-ip>:3000` from another device on the same network (change `APP_PORT` if 3000 is taken). The source library is mounted read-write so `/upload` can store files. Generated previews live in the `lgallery-cache` Docker volume.

Open `/upload`, drag or choose one or more files, then select the library root, an existing album, or enter a new subfolder name. Existing files are never overwritten: LGallery adds a numeric suffix when a name is already present. Any file type can be stored, while only supported photo and video formats appear in the gallery.

> LGallery asks for a password, but over plain HTTP it travels unencrypted. Keep port 3000 on a trusted LAN, or put it
> behind HTTPS, and do not expose it directly to the internet.

## Update a deployment

`./scripts/update.sh` pulls the latest code and builds the image while the old container keeps running, then
restarts it. The Home Server Dashboard runs this script when you update LGallery from it.

## Local development

Install dependencies and run Next.js with server-only environment variables:

```bash
pnpm install
MEDIA_LIBRARY_PATH=/absolute/path/to/your/photos \
MEDIA_CACHE_PATH=/absolute/path/to/a/writable/cache \
LGALLERY_PASSWORD=choose-one \
pnpm dev
```

Install `ffmpeg` locally to obtain real video metadata and posters. Images still work without it; videos retain a fallback poster and can still play when the browser supports their codec.

The library is rescanned on a fresh page load. Refresh the browser after adding, moving, or removing files. Hidden files and folders and symbolic links are ignored. The account running LGallery must have write permission on `MEDIA_LIBRARY_PATH` for uploads to work.

## Keyboard and viewer controls

- `Escape`: close the viewer.
- `Left` / `Right`: previous or next library item.
- `Space` / `K`: play or pause video.
- `J` / `L`: seek video backward or forward ten seconds; on a touch screen, double tap the left or right side.
- `Up` / `Down`: change the volume; `M`: mute or unmute.
- `F` or double click: full screen. On an iPhone the video opens in the system's full-screen player.
- `0`–`9`: jump to that tenth of the video; `Home` / `End`: start or end.
- `Shift` + `<` / `>`: playback speed, also in the player's settings.
- On a touch screen, tap the video to show or hide its controls.
- Photos support wheel/pinch zoom, drag-to-pan, and double-click to toggle zoom.

## Validation

```bash
pnpm lint
pnpm test
pnpm build
docker compose build
```
