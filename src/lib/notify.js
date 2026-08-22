import { toast } from 'sonner';

export function showNotification({ title, message, color = 'blue' }) {
  const options = message ? { description: message } : undefined;
  if (color === 'red') return toast.error(title, options);
  if (color === 'green') return toast.success(title, options);
  return toast.info(title, options);
}
