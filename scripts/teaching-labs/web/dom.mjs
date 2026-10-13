// W025 — One delegated listener handles current and future rows. closest() lets
// clicks on nested icons resolve to their actionable row button.
export function delegate(root, selector, type, handler) {
  const listener = event => { const target = event.target.closest(selector); if (target && root.contains(target)) handler(event, target); };
  root.addEventListener(type, listener);
  return () => root.removeEventListener(type, listener);
}

// W026 — Derive hidden state and aria-expanded from the same boolean so visual
// and assistive technology state cannot drift apart.
export function setDisclosure(button, panel, expanded) {
  button.setAttribute('aria-expanded', String(expanded)); panel.hidden = !expanded;
}

// W027 — Native dialog supplies modal semantics and focus containment; this
// controller adds Escape/close cleanup and returns focus to the invoking button.
export function setupDialog(dialog, opener) {
  const onClose = () => opener.focus();
  dialog.addEventListener('close', onClose);
  return {
    open() { dialog.showModal(); },
    close() { if (dialog.open) dialog.close(); },
    dispose() {
      const wasOpen = dialog.open;
      if (wasOpen) dialog.close();
      dialog.removeEventListener('close', onClose);
      // Native close events are queued, so disposal restores focus synchronously.
      if (wasOpen) opener.focus();
    },
  };
}

// W028 — A combobox keeps focus on the input and exposes the active option by
// stable ID; arrow navigation does not move DOM focus into the popup.
export function moveActiveOption(options, current, delta) {
  if (!options.length) return -1;
  return (current + delta + options.length) % options.length;
}

// W029 — Observe each image once and disconnect after loading; the positive
// rootMargin starts work before the image reaches the viewport edge.
export function observeImages(images, { IntersectionObserverImpl = IntersectionObserver } = {}) {
  const observer = new IntersectionObserverImpl(entries => {
    for (const entry of entries) if (entry.isIntersecting) { const image = entry.target; image.src = image.dataset.src; observer.unobserve(image); }
  }, { rootMargin: '200px' });
  for (const image of images) observer.observe(image);
  return () => observer.disconnect();
}

// W030 — Error IDs are tokenized and deduplicated because aria-describedby may
// already reference persistent help text on the field.
export function setFieldError(field, errorNode, message) {
  const ids = new Set((field.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
  if (message) { ids.add(errorNode.id); errorNode.textContent = message; errorNode.hidden = false; field.setAttribute('aria-invalid', 'true'); }
  else { ids.delete(errorNode.id); errorNode.textContent = ''; errorNode.hidden = true; field.removeAttribute('aria-invalid'); }
  if (ids.size) field.setAttribute('aria-describedby', [...ids].join(' ')); else field.removeAttribute('aria-describedby');
}

// W031 — Tab wrapping applies only to the active modal's focusable descendants;
// native <dialog> remains the preferred primitive for production modal UI.
export function wrapTab(event, focusables, activeElement = globalThis.document?.activeElement) {
  if (event.key !== 'Tab' || !focusables.length) return false;
  const first = focusables[0]; const last = focusables.at(-1);
  if (event.shiftKey && activeElement === first) { event.preventDefault(); last.focus(); return true; }
  if (!event.shiftKey && activeElement === last) { event.preventDefault(); first.focus(); return true; }
  return false;
}

// W032 — Disable only while a submission is pending; finally restores the
// control after either fulfillment or rejection so failure remains retryable.
export async function submitOnce(button, submit) {
  if (button.disabled) return { status: 'ignored' };
  button.disabled = true;
  try { return { status: 'submitted', value: await submit() }; }
  catch (error) { return { status: 'failed', error }; }
  finally { button.disabled = false; }
}
