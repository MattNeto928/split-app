// Split is a light-only app. Always report 'light' so any screen that branches
// on the color scheme takes the light path and dark mode is effectively off.
export function useColorScheme(): 'light' | 'dark' {
  return 'light';
}
