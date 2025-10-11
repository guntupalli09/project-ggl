declare module 'html2canvas' {
  interface Html2CanvasOptions {
    backgroundColor?: string | null
    scale?: number
    useCORS?: boolean
    allowTaint?: boolean
    width?: number
    height?: number
    x?: number
    y?: number
    scrollX?: number
    scrollY?: number
    windowWidth?: number
    windowHeight?: number
    logging?: boolean
    imageTimeout?: number
    removeContainer?: boolean
    foreignObjectRendering?: boolean
    onclone?: (clonedDoc: Document, element: HTMLElement) => void
  }

  function html2canvas(element: HTMLElement, options?: Html2CanvasOptions): Promise<HTMLCanvasElement>
  export = html2canvas
}
