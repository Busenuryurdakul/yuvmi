export {};

/**
 * React Native's FormData polyfill accepts a { uri, name, type } file
 * descriptor in addition to the DOM lib's `string | Blob`, but its own type
 * declarations aren't wired into the global `FormData` ambient type — so
 * without this, TypeScript only ever sees the DOM overloads.
 */
declare global {
  interface FormData {
    append(name: string, value: { uri: string; name?: string; type?: string }): void;
  }
}
