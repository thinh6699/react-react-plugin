/** Messages exchanged between the React UI (iframe) and the main plugin thread. */

export type UIToPluginMessage =
  | {
      type: 'create-rectangles'
      count: number
      color: HexColor
      labelText: string
      labelFontSize: number
    }
  | { type: 'apply-fill'; color: HexColor }
  | { type: 'apply-size'; width: number; height: number }
  | { type: 'apply-text'; characters: string; fontSize: number }
  | { type: 'delete-created' }
  | { type: 'delete-selection' }
  | { type: 'close' }
  | { type: 'resize'; width: number; height: number }

/** Snapshot of the first selected node for Edit form prefills. */
export type SelectionSnapshot = {
  selectionCount: number
  selectionNames: string[]
  trackedCount: number
  width: number | null
  height: number | null
  fill: HexColor | null
  characters: string | null
  fontSize: number | null
  isText: boolean
}

export type PluginToUIMessage =
  | ({ type: 'selection-change' } & SelectionSnapshot)
  | { type: 'created'; count: number; trackedCount: number }
  | { type: 'deleted'; count: number; trackedCount: number; scope: DeleteScope }
  | { type: 'action-done'; message: string; trackedCount: number }

export type DeleteScope = 'created' | 'selection'

export type HexColor = `#${string}`
