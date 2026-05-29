// CSS module declarations
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// Side-effect CSS imports (e.g. global.css for NativeWind)
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
