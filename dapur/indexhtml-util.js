export const IDX_TITLE = 0;
export const IDX_FILENAME = 1;
export const IDX_IMAGE = 2;
export const IDX_DATE = 3;
export const IDX_DESCRIPTION = 4;
export const DEFAULT_THUMBNAIL = '/thumbnail.webp';

export const CATEGORY_ICON_MAP = [
  { key: 'Linux & Open Source', icon: '🐧' },
  { key: 'Sejarah & Religi', icon: '📚' },
  { key: 'Multimedia & Editing', icon: '📸' }, 
  { key: 'Lainnya', icon: '🔆' }, 
  { key: 'Kuliner, Gaya Hidup & Kesehatan', icon: '🍜' },
  { key: 'Catatan & Opini Sosial', icon: '📢' }, 
  { key: 'Teknologi Web, AI & Umum', icon: '🖥️' },
];

export function getIconAndClass(categoryName) {
  const found = CATEGORY_ICON_MAP.find(m => categoryName.includes(m.key));
  return found || { icon: '📄', cls: 'default' };
}

export function categoryToId(categoryName) {
  return categoryName.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}
