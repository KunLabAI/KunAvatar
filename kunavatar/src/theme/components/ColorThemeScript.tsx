'use client';

import React from 'react';

const THEME_STORAGE_KEY = 'color-theme';

// This script is injected into the <head> to prevent FOUC (Flash of Unstyled Content)
// for the color theme. It runs before the page content renders.
const colorThemeScript = `
(function() {
  try {
    const theme = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (theme) {
      document.documentElement.setAttribute('data-color-theme', theme);
    } else {
      // You can set a default theme if none is found
      document.documentElement.setAttribute('data-color-theme', 'kun');
    }
  } catch (e) {
    console.warn('Could not set color theme from localStorage', e);
  }
})();
`;

export function ColorThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: colorThemeScript }} />;
} 