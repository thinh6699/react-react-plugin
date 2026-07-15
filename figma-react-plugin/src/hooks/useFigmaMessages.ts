import { useEffect } from 'react'
import type {
  DeleteScope,
  PluginToUIMessage,
  UIToPluginMessage
} from '../shared/messages'

/** Send a typed message from the UI iframe to the main plugin thread. */
export function postToPlugin(message: UIToPluginMessage) {
  parent.postMessage({ pluginMessage: message }, '*')
}

type FigmaMessageHandlers = {
  onSelectionChange?: (
    selectionCount: number,
    selectionNames: string[],
    trackedCount: number
  ) => void
  onCreated?: (count: number, trackedCount: number) => void
  onDeleted?: (count: number, trackedCount: number, scope: DeleteScope) => void
}

/** Listen for messages from the main plugin thread. */
export function useFigmaMessages(handlers: FigmaMessageHandlers) {
  const { onSelectionChange, onCreated, onDeleted } = handlers

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage as PluginToUIMessage | undefined
      if (!message) return

      switch (message.type) {
        case 'selection-change':
          onSelectionChange?.(
            message.selectionCount,
            message.selectionNames,
            message.trackedCount
          )
          break
        case 'created':
          onCreated?.(message.count, message.trackedCount)
          break
        case 'deleted':
          onDeleted?.(message.count, message.trackedCount, message.scope)
          break
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onSelectionChange, onCreated, onDeleted])
}
