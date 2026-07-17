import { useEffect } from 'react'
import type {
  DeleteScope,
  PluginToUIMessage,
  SelectionExportNode,
  SelectionSnapshot,
  UIToPluginMessage,
} from '../shared/messages'

/** Send a typed message from the UI iframe to the main plugin thread. */
export function postToPlugin(message: UIToPluginMessage) {
  parent.postMessage({ pluginMessage: message }, '*')
}

type FigmaMessageHandlers = {
  onSelectionChange?: (payload: SelectionSnapshot) => void
  onCreated?: (count: number, trackedCount: number) => void
  onDeleted?: (count: number, trackedCount: number, scope: DeleteScope) => void
  onActionDone?: (message: string, trackedCount: number) => void
  onSelectionExportPayload?: (payload: {
    fileName: string
    pageName: string
    nodes: SelectionExportNode[]
  }) => void
  onStorageValue?: (key: string, value: string | undefined) => void
  onPluginDataValue?: (key: string, value: string) => void
  onExportPng?: (bytesBase64: string, nodeName: string) => void
}

/** Listen for messages from the main plugin thread. */
export function useFigmaMessages({
  onSelectionChange,
  onCreated,
  onDeleted,
  onActionDone,
  onSelectionExportPayload,
  onStorageValue,
  onPluginDataValue,
  onExportPng,
}: FigmaMessageHandlers) {
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage as PluginToUIMessage | undefined
      if (!message) return

      switch (message.type) {
        case 'selection-change': {
          const { type: _type, ...snapshot } = message
          onSelectionChange?.(snapshot)
          break
        }
        case 'created':
          onCreated?.(message.count, message.trackedCount)
          break
        case 'deleted':
          onDeleted?.(message.count, message.trackedCount, message.scope)
          break
        case 'action-done':
          onActionDone?.(message.message, message.trackedCount)
          break
        case 'selection-export-payload':
          onSelectionExportPayload?.({
            fileName: message.fileName,
            pageName: message.pageName,
            nodes: message.nodes,
          })
          break
        case 'storage-value':
          onStorageValue?.(message.key, message.value)
          break
        case 'plugin-data-value':
          onPluginDataValue?.(message.key, message.value)
          break
        case 'export-png-result':
          onExportPng?.(message.bytesBase64, message.nodeName)
          break
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [
    onSelectionChange,
    onCreated,
    onDeleted,
    onActionDone,
    onSelectionExportPayload,
    onStorageValue,
    onPluginDataValue,
    onExportPng,
  ])
}
