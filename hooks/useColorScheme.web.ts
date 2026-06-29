// Split is a light-only app — web matches native and always reports 'light'.
export function useColorScheme(): 'light' | 'dark' {
  return 'light';
}
