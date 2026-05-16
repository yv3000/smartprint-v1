/**
 * Post-render pagination for docx-preview output.
 *
 * docx-preview only honours <w:lastRenderedPageBreak/> + explicit page
 * breaks. Documents that were never saved by Word (programmatically
 * generated, Google Docs exports, etc.) lack those markers, so all
 * content collapses into a single oversized <section.docx>.
 *
 * This helper walks every top-level section inside a host element and,
 * if the section's rendered height exceeds its declared page height
 * (min-height), redistributes its <article> flow children across cloned
 * section pages. Header / footer / padding / inline styles are preserved
 * per page.
 *
 * Must be called while the host is still attached to the DOM, otherwise
 * heights cannot be measured.
 */
export function splitOverflowingSections(host: HTMLElement): void {
  const topLevel = Array.from(
    host.querySelectorAll<HTMLElement>("section.docx, section[class*='docx']"),
  ).filter((el) => el.parentElement === host || el.parentElement?.parentElement === host);

  if (!topLevel.length) return;

  for (const section of topLevel) {
    const cs = window.getComputedStyle(section);
    const declaredHeight =
      parseFloat(cs.minHeight) || section.offsetHeight;
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;

    const header = section.querySelector<HTMLElement>(":scope > header");
    const footer = section.querySelector<HTMLElement>(":scope > footer");
    const articles = Array.from(
      section.querySelectorAll<HTMLElement>(":scope > article"),
    );
    if (!articles.length) continue;

    const headerH = header ? header.offsetHeight : 0;
    const footerH = footer ? footer.offsetHeight : 0;
    const availableContent = Math.max(
      0,
      declaredHeight - padTop - padBottom - headerH - footerH,
    );

    // Already fits — nothing to do.
    if (section.offsetHeight <= declaredHeight + 2) continue;
    if (availableContent <= 0) continue;

    // Collect every flow child across all <article> elements in
    // document order.
    const flowChildren: HTMLElement[] = [];
    for (const a of articles) {
      for (const child of Array.from(a.children)) {
        if (child instanceof HTMLElement) flowChildren.push(child);
      }
    }
    if (!flowChildren.length) continue;

    const articleTemplate = articles[0];

    const newPage = (): { page: HTMLElement; article: HTMLElement } => {
      const page = section.cloneNode(false) as HTMLElement;
      if (header) page.appendChild(header.cloneNode(true));
      const article = articleTemplate.cloneNode(false) as HTMLElement;
      page.appendChild(article);
      // Insert next to original so layout context (font, width)
      // stays identical for measurement.
      section.parentElement?.insertBefore(page, section);
      return { page, article };
    };

    const built: { page: HTMLElement; article: HTMLElement }[] = [];
    let cur = newPage();
    built.push(cur);

    for (const child of flowChildren) {
      cur.article.appendChild(child);
      const articleH = cur.article.offsetHeight;
      if (
        articleH > availableContent &&
        cur.article.children.length > 1
      ) {
        cur.article.removeChild(child);
        cur = newPage();
        built.push(cur);
        cur.article.appendChild(child);
      }
    }

    // Footers placed after content (flex column nowrap with article
    // margin-bottom: auto pushes footer to the bottom of each page).
    if (footer) {
      for (const { page } of built) {
        page.appendChild(footer.cloneNode(true));
      }
    }

    // Remove original oversized section.
    section.parentElement?.removeChild(section);
  }
}

/**
 * Best-effort wrapper that swallows DOM errors. Pagination is purely
 * cosmetic — we never want it to crash the surrounding preview.
 */
export function safeSplitOverflowingSections(host: HTMLElement): void {
  try {
    splitOverflowingSections(host);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("docx pagination split failed:", err);
  }
}
