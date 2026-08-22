import { api } from '@/api';

export async function downloadFile(fileId) {
  const url = await api.getFileDownloadUrl(fileId);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function copyFileDownloadLink(fileId) {
  const url = await api.getFileDownloadUrl(fileId);
  await navigator.clipboard.writeText(url);
  return url;
}

export async function loadFilePreviewUrl(fileId) {
  return api.getFileViewUrl(fileId);
}
