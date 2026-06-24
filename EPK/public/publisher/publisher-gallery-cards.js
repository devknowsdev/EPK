let galleryCardPreviewAttempts = 0;
let galleryCardPreviewObserver = null;

document.addEventListener('DOMContentLoaded', waitForGalleryCards);

function waitForGalleryCards() {
  galleryCardPreviewAttempts += 1;
  if (typeof currentData !== 'undefined' && currentData && document.getElementById('gallery-list')) {
    installGalleryCardPreviews();
    return;
  }
  if (galleryCardPreviewAttempts < 80) setTimeout(waitForGalleryCards, 100);
}

function installGalleryCardPreviews() {
  updateGalleryCardPreviews();
  bindGalleryCardInputs();
  const target = document.getElementById('gallery-list');
  if (!target || galleryCardPreviewObserver) return;
  galleryCardPreviewObserver = new MutationObserver(() => {
    updateGalleryCardPreviews();
    bindGalleryCardInputs();
  });
  galleryCardPreviewObserver.observe(target, { childList: true, subtree: true });
}

function updateGalleryCardPreviews() {
  const list = document.getElementById('gallery-list');
  if (!list || typeof currentData === 'undefined' || !currentData) return;
  const cards = [...list.querySelectorAll('.item-card')];
  cards.forEach((card, index) => {
    const item = currentData.gallery?.[index] || readGalleryCardFields(card);
    let preview = card.querySelector('.gallery-card-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'gallery-card-preview';
      card.querySelector('.item-head')?.insertAdjacentElement('afterend', preview);
    }
    preview.innerHTML = renderGalleryCardPreview(item, index);
  });
}

function bindGalleryCardInputs() {
  const list = document.getElementById('gallery-list');
  if (!list) return;
  [...list.querySelectorAll('.item-card')].forEach(card => {
    if (card.dataset.galleryPreviewBound === 'true') return;
    card.dataset.galleryPreviewBound = 'true';
    card.addEventListener('input', () => {
      setTimeout(updateGalleryCardPreviews, 0);
    });
  });
}

function renderGalleryCardPreview(item, index) {
  const src = item?.src || '';
  const caption = item?.caption || `Photo ${index + 1}`;
  const resolved = publisherGalleryAssetURL(src);
  const image = src
    ? `<img src="${gallerySafeAttr(resolved)}" alt="${gallerySafeAttr(caption)}" loading="lazy" onerror="this.parentElement.classList.add('is-missing');this.remove();this.parentElement.textContent='Image not found';">`
    : 'No image path yet';
  return `
    <div class="gallery-card-preview__image${src ? '' : ' is-missing'}">${image}</div>
    <div class="gallery-card-preview__meta">
      <strong>${gallerySafe(caption)}</strong>
      <code>${gallerySafe(src || 'photos/...')}</code>
      <p class="help">This is the image attached to this Gallery card.</p>
    </div>`;
}

function readGalleryCardFields(card) {
  const inputs = [...card.querySelectorAll('input')];
  return {
    src: inputs[0]?.value || '',
    caption: inputs[1]?.value || ''
  };
}

function publisherGalleryAssetURL(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `/${String(path).replace(/^\/+/, '')}`;
}

function gallerySafe(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function gallerySafeAttr(value) {
  return gallerySafe(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
