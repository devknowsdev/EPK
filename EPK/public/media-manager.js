// EPK Media Manager foundation
// Browser-only helper module. Keeps media metadata compatible with epk.json.

window.EPKMediaManager = {
  roles: ['hero','banner','gallery'],

  normalise(item = {}) {
    return {
      ...item,
      role: item.role || 'gallery',
      modes: Array.isArray(item.modes) ? item.modes : []
    };
  },

  setRole(media, role) {
    media.role = this.roles.includes(role) ? role : 'gallery';
    return media;
  },

  setModes(media, modes) {
    media.modes = modes
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);
    return media;
  },

  validate(gallery = []) {
    const issues = [];
    const hero = gallery.find(item => item.role === 'hero');

    if (!hero) issues.push('No hero image assigned');

    gallery.forEach((item, index) => {
      if (!item.role) issues.push(`Image ${index + 1} missing role`);
      if (!item.src) issues.push(`Image ${index + 1} missing source`);
    });

    return issues;
  }
};
