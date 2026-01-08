// Only import jest-dom if we're in a DOM environment
if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom');
}
