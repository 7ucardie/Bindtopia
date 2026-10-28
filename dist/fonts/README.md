# Typography

The inspected Pokemon.com stylesheet uses Flexo Regular/Medium/Demi/Bold and Roboto. This project bundles Roboto from https://github.com/google/fonts/tree/main/ofl/roboto under SIL OFL (Roboto-OFL.txt).

Flexo is a commercial typeface. typography.css can resolve locally installed licensed Flexo, but no Flexo font software has been copied or embedded. Supply a licensed webfont kit before adding @font-face URLs. Keep commercial font files outside the open-source download unless their license expressly allows redistribution. The native iPhone app may require a separate embedding license.

The site loads `Roboto-Variable.woff2`, a subset of `Roboto-Variable.ttf` (Latin, Latin Extended, Greek, punctuation, currency and arrow symbols). Other characters fall back to the system font. Regenerate it after replacing the TTF:

```sh
pyftsubset dist/fonts/Roboto-Variable.ttf --unicodes="U+0000-024F,U+0259,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-036F,U+0370-03FF,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF,U+2212,U+2215,U+2248,U+2264-2265,U+25A0-25FF,U+2713,U+2715" --layout-features='*' --flavor=woff2 --output-file=dist/fonts/Roboto-Variable.woff2
```
