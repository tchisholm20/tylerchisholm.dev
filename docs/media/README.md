# Local video loops

YouTube previews work, but they show YouTube's title overlay for a moment and depend on YouTube loading. A short local MP4 loop starts instantly and looks cleaner.

## Making a loop

Cut 8 to 15 seconds of your best moment from the source capture, not from the YouTube upload:

```
ffmpeg -ss 00:00:12 -i capture.mp4 -t 12 -an -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart everent-destruction.mp4
```

- `-ss` is where the moment starts, and `-t` is its length.
- `-an` strips audio, since previews are muted.
- Aim for under 4 MB per loop.

## Using it

Put the file in this folder and add `data-loop` next to the matching `data-yt` in `index.html`:

```html
<div class="reel-frame" data-yt="FoDRT-KfREg" data-loop="media/everent-destruction.mp4">
```

For a "What I did" item, put `data-loop` on its `.did-head` button instead. "Play with sound" still opens the full YouTube video.

## Moments worth cutting

| File | Moment |
| --- | --- |
| `everent-hero.mp4` | The best 10 seconds of riding, for the top of the page |
| `everent-destruction.mp4` | A wall breaking at speed, then one that holds below the threshold |
| `spatial-sponza.mp4` | A slow move through the path-traced Sponza |
| `spatial-portal.mp4` | Walking through a portal into curved space |
| `pocket-doorway.mp4` | Stepping through a door into a room bigger than the outside |
