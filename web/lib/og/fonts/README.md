# Fonts for social images

`next/og` (Satori) can't read woff2 or variable fonts, so these are static
TTF/OTF copies of the self-hosted subsets in [`app/fonts/`](../../../app/fonts/README.md).
They are made from those files, with the same glyph coverage, and read from disk
by `lib/og/image.tsx` when the site builds. Nothing is fetched over the network.

| File                        | Made from                                                                           | Licence                                                       |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `JetBrainsMono-400.ttf`     | `app/fonts/jetbrains-mono/JetBrainsMono-Roman-subset.woff2`, `wght=400` instance    | SIL OFL 1.1, [`OFL-JetBrainsMono.txt`](OFL-JetBrainsMono.txt) |
| `JetBrainsMono-700.ttf`     | the same file, `wght=700` instance                                                  | SIL OFL 1.1, [`OFL-JetBrainsMono.txt`](OFL-JetBrainsMono.txt) |
| `DepartureMono-Regular.otf` | `app/fonts/departure-mono/DepartureMono-Regular-subset.woff2`, unwrapped from woff2 | SIL OFL 1.1, [`OFL-DepartureMono.txt`](OFL-DepartureMono.txt) |

Like the subsets they come from, these are Modified Versions under the OFL and
keep the original family names (neither font has a Reserved Font Name).

## Recipe

[fontTools](https://github.com/fonttools/fonttools) 4.x with `brotli`, run from `web/`:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

for w in (400, 700):
    f = TTFont("app/fonts/jetbrains-mono/JetBrainsMono-Roman-subset.woff2")
    inst = instancer.instantiateVariableFont(f, {"wght": w}, updateFontNames=False)
    inst.flavor = None
    inst.save(f"lib/og/fonts/JetBrainsMono-{w}.ttf")

f = TTFont("app/fonts/departure-mono/DepartureMono-Regular-subset.woff2")
f.flavor = None
f.save("lib/og/fonts/DepartureMono-Regular.otf")
```
