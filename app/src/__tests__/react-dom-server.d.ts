// Only the server-rendering API used by the native-without-DOM boundary test.
declare module 'react-dom/server' {
  export function renderToStaticMarkup(element: import('react').ReactNode): string;
}
declare module 'react-dom/client' {
  export function createRoot(container: Element): { render(element: import('react').ReactNode): void };
}
