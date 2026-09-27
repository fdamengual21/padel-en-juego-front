/** Lista al costado del ancla, o arriba si no entra. Siempre dentro del viewport. */
export function placeAgendaPopover(
  anchor: HTMLElement,
  menu: HTMLElement,
): { top: number; left: number } {
  const rect = anchor.getBoundingClientRect();
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const gap = 8;
  const margin = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const grid = anchor.closest(
    "[data-testid='court-agenda-grid'], [data-testid='court-agenda-month-grid']",
  );
  const gridRect = grid?.getBoundingClientRect();
  const anchorMid = rect.left + rect.width / 2;
  const split = gridRect ? gridRect.left + gridRect.width / 2 : viewportWidth / 2;
  const preferRight = anchorMid < split;
  const rightLeft = rect.right + gap;
  const leftLeft = rect.left - gap - menuWidth;
  const fits = (left: number) =>
    left >= margin && left + menuWidth <= viewportWidth - margin;

  let left: number | null = null;
  if (preferRight && fits(rightLeft)) left = rightLeft;
  else if (!preferRight && fits(leftLeft)) left = leftLeft;
  else if (fits(rightLeft)) left = rightLeft;
  else if (fits(leftLeft)) left = leftLeft;

  const maxTop = Math.max(margin, viewportHeight - margin - menuHeight);
  if (left == null) {
    const aboveTop = rect.top - gap - menuHeight;
    const clampedLeft = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, viewportWidth - menuWidth - margin),
    );
    const top =
      aboveTop >= margin
        ? aboveTop
        : Math.min(Math.max(margin, rect.bottom + gap), maxTop);
    return { top, left: clampedLeft };
  }

  let top = rect.top;
  if (top > maxTop) top = maxTop;
  if (top < margin) top = margin;
  return { top, left };
}
