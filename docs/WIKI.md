# How the wiki is organised / Come è organizzata la wiki

The pages in [`docs/wiki`](wiki) are written **for the GitHub Wiki** (a separate repository: `Mr.Emulator.wiki`), which is why they look odd when browsed here:

- **Flat files**, no sub-folders. English pages have plain names (`Home.md`, `Getting-Started.md`…); Italian pages start with `IT-` (`IT-Home.md`, `IT-Primi-Passi.md`…).
- **Links have no `.md`** — that is how the GitHub Wiki links pages (`[text](Page-Name)`), so they do not work when clicked inside this folder on github.com.
- **Images are loaded from this repository** (`docs/wiki/img`) through `raw.githubusercontent.com`, so you never need to upload images to the wiki. Do not move or rename that folder.
- `_Sidebar.md` and `_Footer.md` are special files used by every wiki page.

## Publishing / updating the wiki

1. On GitHub, open the repository's **Wiki** tab and create the first page (this creates the wiki repository).
2. Clone it and copy the pages:
   ```bash
   git clone https://github.com/VjAlbert/Mr.Emulator.wiki.git
   cp docs/wiki/*.md Mr.Emulator.wiki/
   cd Mr.Emulator.wiki && git add -A && git commit -m "Update wiki" && git push
   ```
3. The wiki's home page is `Home`; the Italian home is `IT-Home`.

`docs/wiki` stays the source of truth: edit here, then copy to the wiki repository again.

## Regenerating the screenshots

The screenshots in `docs/wiki/img` were captured from the built app with Playwright using invented sample games; they are stored as WebP to keep the repository small.

---

Le pagine in [`docs/wiki`](wiki) sono scritte **per la Wiki di GitHub** (un repository separato, `Mr.Emulator.wiki`): per questo, aprendole qui, i link non funzionano (non hanno `.md`). Copia tutti i file `*.md` nel repository della wiki; le immagini si caricano da questo repository e non vanno caricate nella wiki. La cartella `docs/wiki` resta la sorgente: modifica qui e copia di nuovo.
