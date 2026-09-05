declare module 'bwip-js' {
  type BWIPJSOptions = Record<string, unknown>

  const bwipjs: {
    toCanvas: (canvas: HTMLCanvasElement, opts: BWIPJSOptions) => void
  }

  export default bwipjs
}
