/** Messages exchanged between the React UI (iframe) and the main plugin thread. */

export type UIToPluginMessage =
  | { type: 'create-rectangles'; count: number; color: HexColor }
  | { type: 'delete-created' }
  | { type: 'delete-selection' }
  | { type: 'close' }
  | { type: 'resize'; width: number; height: number }

export type PluginToUIMessage =
  | {
      type: 'selection-change'
      selectionCount: number
      selectionNames: string[]
      trackedCount: number
    }
  | { type: 'created'; count: number; trackedCount: number }
  | { type: 'deleted'; count: number; trackedCount: number; scope: DeleteScope }

export type DeleteScope = 'created' | 'selection'

export type HexColor = `#${string}`
