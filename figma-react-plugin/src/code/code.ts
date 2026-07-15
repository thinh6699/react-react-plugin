import type { PluginToUIMessage, UIToPluginMessage } from '../shared/messages'
import { PLUGIN_UI } from '../shared/uiSizes'

/** Node ids created by this plugin in the current run (until closed). */
const createdNodeIds = new Set<string>()
/** Each Create batch goes on the next row. */
let nextRowIndex = 0

const CELL = 150

figma.showUI(__html__, {
  width: PLUGIN_UI.width,
  height: PLUGIN_UI.heightDefault,
  themeColors: true,
})

function postToUI(message: PluginToUIMessage) {
  figma.ui.postMessage(message)
}

async function pruneMissingCreatedNodes() {
  for (const id of [...createdNodeIds]) {
    const node = await figma.getNodeByIdAsync(id)
    if (!node) {
      createdNodeIds.delete(id)
    }
  }
}

async function notifySelection() {
  await pruneMissingCreatedNodes()
  const selection = figma.currentPage.selection
  postToUI({
    type: 'selection-change',
    selectionCount: selection.length,
    selectionNames: selection.map((node) => node.name),
    trackedCount: createdNodeIds.size,
  })
}

figma.on('selectionchange', () => {
  void notifySelection()
})
void notifySelection()

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  }
}

figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  switch (msg.type) {
    case 'create-rectangles': {
      const nodes: SceneNode[] = []
      const color = hexToRgb(msg.color)
      const row = nextRowIndex
      nextRowIndex += 1
      const nameOffset = createdNodeIds.size

      for (let i = 0; i < msg.count; i++) {
        const rect = figma.createRectangle()
        rect.x = i * CELL
        rect.y = row * CELL
        rect.resize(100, 100)
        rect.fills = [{ type: 'SOLID', color }]
        rect.name = `Rect ${nameOffset + i + 1}`
        figma.currentPage.appendChild(rect)
        createdNodeIds.add(rect.id)
        nodes.push(rect)
      }

      // Zoom to new nodes without changing selection (avoids selectionchange).
      figma.viewport.scrollAndZoomIntoView(nodes)
      postToUI({
        type: 'created',
        count: msg.count,
        trackedCount: createdNodeIds.size,
      })
      figma.notify(`Created ${msg.count} rectangle(s)`)
      break
    }

    case 'delete-created': {
      await pruneMissingCreatedNodes()
      let removed = 0

      for (const id of [...createdNodeIds]) {
        const node = await figma.getNodeByIdAsync(id)
        if (node) {
          node.remove()
          removed += 1
        }
        createdNodeIds.delete(id)
      }

      nextRowIndex = 0

      postToUI({
        type: 'deleted',
        count: removed,
        trackedCount: 0,
        scope: 'created',
      })
      figma.notify(
        removed > 0
          ? `Deleted ${removed} created rectangle(s)`
          : 'No created rectangles to delete',
      )
      break
    }

    case 'delete-selection': {
      const selection = [...figma.currentPage.selection]
      let removed = 0

      for (const node of selection) {
        createdNodeIds.delete(node.id)
        node.remove()
        removed += 1
      }

      await pruneMissingCreatedNodes()
      postToUI({
        type: 'deleted',
        count: removed,
        trackedCount: createdNodeIds.size,
        scope: 'selection',
      })
      figma.notify(
        removed > 0
          ? `Deleted ${removed} selected node(s)`
          : 'Nothing selected to delete',
      )
      break
    }

    case 'resize': {
      figma.ui.resize(msg.width, msg.height)
      break
    }

    case 'close': {
      figma.closePlugin()
      break
    }
  }
}
