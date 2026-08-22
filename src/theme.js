import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
    blue: [
      '#eef3ff',
      '#dce4f5',
      '#b9c7e2',
      '#94a8d0',
      '#748dc0',
      '#5f7cb9',
      '#5474b6',
      '#3d7fe0',
      '#3766b9',
      '#2d56a3',
    ],
  },
  defaultRadius: 'md',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});
