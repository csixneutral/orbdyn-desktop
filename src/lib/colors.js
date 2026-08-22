/** Map Mantine-style color names to Tailwind classes for badges, avatars, and progress bars. */
const COLOR_CLASSES = {
  blue: { badge: 'bg-blue-500 hover:bg-blue-500', light: 'bg-blue-500/15 text-blue-400 border-blue-500/30', progress: 'bg-blue-500', avatar: 'bg-blue-500 text-white', icon: 'text-blue-500' },
  cyan: { badge: 'bg-cyan-500 hover:bg-cyan-500', light: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', progress: 'bg-cyan-500', avatar: 'bg-cyan-500 text-white', icon: 'text-cyan-500' },
  green: { badge: 'bg-green-500 hover:bg-green-500', light: 'bg-green-500/15 text-green-400 border-green-500/30', progress: 'bg-green-500', avatar: 'bg-green-500 text-white', icon: 'text-green-500' },
  red: { badge: 'bg-red-500 hover:bg-red-500', light: 'bg-red-500/15 text-red-400 border-red-500/30', progress: 'bg-red-500', avatar: 'bg-red-500 text-white', icon: 'text-red-500' },
  yellow: { badge: 'bg-yellow-500 hover:bg-yellow-500', light: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', progress: 'bg-yellow-500', avatar: 'bg-yellow-500 text-white', icon: 'text-yellow-500' },
  orange: { badge: 'bg-orange-500 hover:bg-orange-500', light: 'bg-orange-500/15 text-orange-400 border-orange-500/30', progress: 'bg-orange-500', avatar: 'bg-orange-500 text-white', icon: 'text-orange-500' },
  violet: { badge: 'bg-violet-500 hover:bg-violet-500', light: 'bg-violet-500/15 text-violet-400 border-violet-500/30', progress: 'bg-violet-500', avatar: 'bg-violet-500 text-white', icon: 'text-violet-500' },
  gray: { badge: 'bg-gray-500 hover:bg-gray-500', light: 'bg-gray-500/15 text-gray-400 border-gray-500/30', progress: 'bg-gray-500', avatar: 'bg-gray-500 text-white', icon: 'text-gray-500' },
  amber: { badge: 'bg-amber-500 hover:bg-amber-500', light: 'bg-amber-500/15 text-amber-400 border-amber-500/30', progress: 'bg-amber-500', avatar: 'bg-amber-500 text-white', icon: 'text-amber-500' },
};

export function isHexColor(color) {
  return typeof color === 'string' && color.startsWith('#');
}

export function getColorClasses(color, variant = 'badge') {
  if (!color || isHexColor(color)) return COLOR_CLASSES.blue[variant];
  return COLOR_CLASSES[color]?.[variant] || COLOR_CLASSES.blue[variant];
}

export function getBadgeStyle(color) {
  if (isHexColor(color)) {
    return { backgroundColor: color, borderColor: color };
  }
  return undefined;
}

export function getProgressStyle(color) {
  if (isHexColor(color)) {
    return { backgroundColor: color };
  }
  return undefined;
}

export function getTintStyle(color, alpha = '33') {
  if (isHexColor(color)) {
    return { backgroundColor: `${color}${alpha}`, borderLeftColor: color };
  }
  return undefined;
}
