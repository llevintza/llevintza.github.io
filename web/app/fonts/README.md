# Self-hosted fonts

Loaded by `lib/theme/fonts.ts` through `next/font/local`, so the files are
served from `/_next/static/media/` with the site. Nothing is fetched from a
font CDN at runtime.

| Font           | Version | Source                                                                                            | Licence                                                         | Files                                                                               |
| -------------- | ------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| JetBrains Mono | 2.304   | <https://github.com/JetBrains/JetBrainsMono/releases/tag/v2.304> (`fonts/variable/*.ttf`)         | SIL OFL 1.1, [`jetbrains-mono/OFL.txt`](jetbrains-mono/OFL.txt) | `JetBrainsMono-Roman-subset.woff2` (preloaded), `JetBrainsMono-Italic-subset.woff2` |
| Departure Mono | 1.500   | <https://github.com/rektdeckard/departure-mono/releases/tag/v1.500> (`DepartureMono-Regular.otf`) | SIL OFL 1.1, [`departure-mono/OFL.txt`](departure-mono/OFL.txt) | `DepartureMono-Regular-subset.woff2`                                                |

Geist Sans (the `--font-prose-sans` fallback) comes from the `geist` npm
package (SIL OFL 1.1) and is not preloaded.

Under the OFL, the subset files are Modified Versions. They keep the
original family names, which neither font declares as a Reserved Font Name.

## Subset recipe

[fontTools](https://github.com/fonttools/fonttools) 4.x with `brotli`:

```sh
U="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2212,U+2500-257F,U+2580-259F,U+FEFF,U+FFFD"

# JetBrains Mono: limit the weight axis to 300-700, then subset.
for f in "JetBrainsMono[wght]" "JetBrainsMono-Italic[wght]"; do
  fonttools varLib.instancer "$f.ttf" wght=300:700 -o "$f-lim.ttf"
  pyftsubset "$f-lim.ttf" --unicodes="$U" --flavor=woff2 \
    --layout-features='kern,calt,liga,zero,ss01,ss02,cv01,tnum,case,mark,mkmk,ccmp,locl' \
    --output-file="$f.woff2"
done

pyftsubset DepartureMono-Regular.otf --unicodes="$U" --flavor=woff2 \
  --layout-features='*' --output-file=DepartureMono-Regular-subset.woff2
```

Coverage: Basic Latin, Latin-1, general punctuation, arrows, box drawing
(`U+2500–257F`) and block elements (`U+2580–259F`, for cursors).
