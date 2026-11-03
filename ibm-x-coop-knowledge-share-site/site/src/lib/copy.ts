// Toast and clipboard helpers shared by the page script and the islands. Browser only.

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('site:toast', { detail: message }));
}

export async function copyText(text: string, message = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API blocked (for example on plain http): fall back to a hidden textarea.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      // Deprecated, but the only option when the Clipboard API is blocked.
      (document as unknown as { execCommand(cmd: string): boolean }).execCommand('copy');
    } finally {
      document.body.removeChild(ta);
    }
  }
  toast(message);
}
