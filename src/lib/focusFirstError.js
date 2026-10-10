/**
 * After a submit finds problems (ui-students item 10): once the error messages have rendered, move
 * focus to the first field marked aria-invalid (Field sets it) and scroll it into view. The field's
 * own label, value, and error message are then read out by screen readers.
 */
export function focusFirstError(root = document) {
  requestAnimationFrame(() => {
    const field = root.querySelector('[aria-invalid="true"]');
    if (!field) return;
    field.focus({ preventScroll: true });
    field.scrollIntoView?.({ block: 'center' }); // absent in some test DOMs
  });
}
