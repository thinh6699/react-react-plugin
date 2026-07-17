/// <reference types="@figma/plugin-typings" />

import type {
  HexColor,
  PluginToUIMessage,
  SelectionSnapshot,
  UIToPluginMessage,
} from '../shared/messages'
import { PLUGIN_UI } from '../shared/uiSizes'

/** Node ids created by this plugin in the current run (until closed). */
const createdNodeIds = new Set<string>()
/** Each Create batch goes on the next row. */
let nextRowIndex = 0

const CELL = 150
const LABEL_LAYER_NAME = 'Label'
const DEFAULT_FONT: FontName = { family: 'Inter', style: 'Regular' }

function isLayoutHost(node: SceneNode): node is SceneNode & LayoutMixin {
  return 'x' in node && 'width' in node && 'height' in node
}

function labelContainerFor(
  host: SceneNode & LayoutMixin,
): SceneNode & LayoutMixin & ChildrenMixin {
  if (
    host.type === 'FRAME' ||
    host.type === 'GROUP' ||
    host.type === 'COMPONENT'
  ) {
    return host as SceneNode & LayoutMixin & ChildrenMixin
  }
  const parent = host.parent
  if (
    parent &&
    (parent.type === 'FRAME' || parent.type === 'GROUP') &&
    'appendChild' in parent
  ) {
    return parent as SceneNode & LayoutMixin & ChildrenMixin
  }
  throw new Error('Label needs a frame container')
}

function findLabelForHost(host: SceneNode): TextNode | null {
  if (host.type === 'TEXT' && host.name === LABEL_LAYER_NAME) return host

  if ('children' in host) {
    const nested = host.children.find(
      (node) => node.type === 'TEXT' && node.name === LABEL_LAYER_NAME,
    )
    if (nested?.type === 'TEXT') return nested
  }

  const parent = host.parent
  if (parent && 'children' in parent) {
    const sibling = parent.children.find(
      (node) => node.type === 'TEXT' && node.name === LABEL_LAYER_NAME,
    )
    if (sibling?.type === 'TEXT') return sibling
  }

  return null
}

function centerTextInContainer(
  text: TextNode,
  container: SceneNode & LayoutMixin,
) {
  text.x = Math.max(0, (container.width - text.width) / 2)
  text.y = Math.max(0, (container.height - text.height) / 2)
}

async function loadFontForText(text?: TextNode): Promise<FontName> {
  if (text && text.fontName !== figma.mixed) {
    await figma.loadFontAsync(text.fontName)
    return text.fontName
  }
  await figma.loadFontAsync(DEFAULT_FONT)
  return DEFAULT_FONT
}

async function writeTextContent(
  text: TextNode,
  characters: string,
  fontSize: number,
) {
  const font = await loadFontForText(text)
  text.fontName = font
  text.fontSize = Math.max(1, Math.min(400, fontSize))
  text.characters = characters
  text.textAutoResize = 'WIDTH_AND_HEIGHT'
  text.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
}

/** Create or update a centered Text label inside the host frame. */
async function upsertCenteredLabel(
  host: SceneNode & LayoutMixin,
  characters: string,
  fontSize: number,
): Promise<TextNode | null> {
  const content = characters.trim()
  if (!content) return null

  const container = labelContainerFor(host)
  let text = findLabelForHost(host)

  if (!text) {
    text = figma.createText()
    text.name = LABEL_LAYER_NAME
    container.appendChild(text)
  } else {
    // Keep label on top of the Fill rectangle
    container.appendChild(text)
  }

  await writeTextContent(text, content, fontSize)
  centerTextInContainer(text, container)
  return text
}

async function updateTextNode(
  text: TextNode,
  characters: string,
  fontSize: number,
): Promise<boolean> {
  const content = characters.trim()
  if (!content) return false
  await writeTextContent(text, content, fontSize)
  return true
}

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

function rgbToHex(color: RGB): HexColor {
  const toHex = (channel: number) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`
}

function solidFillHex(node: SceneNode): HexColor | null {
  if (!('fills' in node) || node.fills === figma.mixed) return null
  const fills = node.fills
  if (!Array.isArray(fills)) return null
  const solid = fills.find(
    (paint) => paint.type === 'SOLID' && paint.visible !== false,
  )
  if (!solid || solid.type !== 'SOLID') return null
  return rgbToHex(solid.color)
}

function buildSelectionSnapshot(
  selection: readonly SceneNode[],
  trackedCount: number,
): SelectionSnapshot {
  const first = selection[0]
  if (!first) {
    return {
      selectionCount: 0,
      selectionNames: [],
      trackedCount,
      width: null,
      height: null,
      fill: null,
      characters: null,
      fontSize: null,
      isText: false,
    }
  }

  const width = 'width' in first ? first.width : null
  const height = 'height' in first ? first.height : null
  let fill = solidFillHex(first)
  if (!fill && 'children' in first) {
    const fillChild = first.children.find(
      (node) => node.name === 'Fill' || node.type === 'RECTANGLE',
    )
    if (fillChild) fill = solidFillHex(fillChild)
  }

  let characters: string | null = null
  let fontSize: number | null = null
  const isText = first.type === 'TEXT'

  if (isText) {
    characters = first.characters
    fontSize =
      first.fontSize === figma.mixed ? null : (first.fontSize as number)
  } else if (isLayoutHost(first)) {
    const label = findLabelForHost(first)
    if (label) {
      characters = label.characters
      fontSize =
        label.fontSize === figma.mixed ? null : (label.fontSize as number)
    }
  }

  return {
    selectionCount: selection.length,
    selectionNames: selection.map((node) => node.name),
    trackedCount,
    width,
    height,
    fill,
    characters,
    fontSize,
    isText,
  }
}

async function notifySelection() {
  await pruneMissingCreatedNodes()
  const selection = figma.currentPage.selection
  postToUI({
    type: 'selection-change',
    ...buildSelectionSnapshot(selection, createdNodeIds.size),
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

function canSetFills(node: SceneNode): node is GeometryMixin & SceneNode {
  return 'fills' in node && node.fills !== figma.mixed
}

function canResize(node: SceneNode): node is LayoutMixin & SceneNode {
  return 'resize' in node && typeof node.resize === 'function'
}

async function applyTextToSelection(characters: string, fontSize: number) {
  const selection = [...figma.currentPage.selection]
  const touched: SceneNode[] = []
  let updated = 0

  for (const node of selection) {
    if (node.type === 'TEXT') {
      if (await updateTextNode(node, characters, fontSize)) {
        touched.push(node)
        updated += 1
      }
      continue
    }

    if (!isLayoutHost(node)) continue

    const label = await upsertCenteredLabel(node, characters, fontSize)
    if (label) {
      touched.push(label)
      updated += 1
    }
  }

  if (touched.length > 0) {
    figma.viewport.scrollAndZoomIntoView(touched)
  }

  return updated
}

figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  switch (msg.type) {
    case 'create-rectangles': {
      const nodes: SceneNode[] = []
      const color = hexToRgb(msg.color)
      const row = nextRowIndex
      nextRowIndex += 1
      const nameOffset = createdNodeIds.size
      const labelText = msg.labelText.trim()
      const labelFontSize = Math.max(1, Math.min(400, msg.labelFontSize))
      let labelError: string | null = null
      let labelsCreated = 0

      for (let i = 0; i < msg.count; i++) {
        const frame = figma.createFrame()
        frame.name = `Rect ${nameOffset + i + 1}`
        frame.resize(100, 100)
        frame.x = i * CELL
        frame.y = row * CELL
        frame.fills = []
        frame.clipsContent = false
        frame.layoutMode = 'NONE'

        const rect = figma.createRectangle()
        rect.name = 'Fill'
        rect.resize(100, 100)
        rect.x = 0
        rect.y = 0
        rect.fills = [{ type: 'SOLID', color }]
        frame.appendChild(rect)

        figma.currentPage.appendChild(frame)
        createdNodeIds.add(frame.id)
        nodes.push(frame)

        if (labelText) {
          try {
            const label = await upsertCenteredLabel(
              frame,
              labelText,
              labelFontSize,
            )
            if (label) {
              labelsCreated += 1
              nodes.push(label)
            }
          } catch (error) {
            labelError =
              error instanceof Error
                ? error.message
                : 'Failed to create label text'
          }
        }
      }

      figma.viewport.scrollAndZoomIntoView(nodes)
      postToUI({
        type: 'created',
        count: msg.count,
        trackedCount: createdNodeIds.size,
      })

      if (labelText && labelsCreated === 0) {
        const message =
          labelError ?? 'Rectangles created, but labels failed'
        postToUI({
          type: 'action-done',
          message,
          trackedCount: createdNodeIds.size,
        })
        figma.notify(message, { error: true })
      } else if (labelText) {
        figma.notify(
          `Created ${msg.count} rectangle(s) with ${labelsCreated} label(s)`,
        )
      } else {
        figma.notify(`Created ${msg.count} rectangle(s)`)
      }
      break
    }

    case 'apply-fill': {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.notify('Select at least one layer')
        break
      }

      const color = hexToRgb(msg.color)
      let updated = 0
      for (const node of selection) {
        if ('children' in node) {
          const fillChild = node.children.find(
            (child) => child.name === 'Fill' && canSetFills(child),
          )
          if (fillChild && canSetFills(fillChild)) {
            fillChild.fills = [{ type: 'SOLID', color }]
            updated += 1
            continue
          }
        }
        if (!canSetFills(node)) continue
        node.fills = [{ type: 'SOLID', color }]
        updated += 1
      }

      const message =
        updated > 0
          ? `Updated fill on ${updated} layer(s)`
          : 'No selected layers support fills'
      postToUI({
        type: 'action-done',
        message,
        trackedCount: createdNodeIds.size,
      })
      figma.notify(message)
      break
    }

    case 'apply-size': {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.notify('Select at least one layer')
        break
      }

      const width = Math.max(1, msg.width)
      const height = Math.max(1, msg.height)
      let updated = 0
      for (const node of selection) {
        if (!canResize(node)) continue
        node.resize(width, height)
        if ('children' in node) {
          const fillChild = node.children.find((child) => child.name === 'Fill')
          if (fillChild && canResize(fillChild)) {
            fillChild.resize(width, height)
            fillChild.x = 0
            fillChild.y = 0
          }
          const label = findLabelForHost(node)
          if (label) {
            centerTextInContainer(label, node)
          }
        }
        updated += 1
      }

      const message =
        updated > 0
          ? `Resized ${updated} layer(s) to ${width}×${height}`
          : 'No selected layers can be resized'
      postToUI({
        type: 'action-done',
        message,
        trackedCount: createdNodeIds.size,
      })
      await notifySelection()
      figma.notify(message)
      break
    }

    case 'apply-text': {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.notify('Select at least one layer')
        break
      }

      try {
        const characters = msg.characters.trim() || 'Text'
        const fontSize = Math.max(1, Math.min(400, msg.fontSize))
        const updated = await applyTextToSelection(characters, fontSize)

        const message =
          updated > 0
            ? `Applied text to ${updated} layer(s)`
            : 'Could not apply text to selection'
        postToUI({
          type: 'action-done',
          message,
          trackedCount: createdNodeIds.size,
        })
        figma.notify(message)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to apply text'
        postToUI({
          type: 'action-done',
          message,
          trackedCount: createdNodeIds.size,
        })
        figma.notify(message)
      }
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

    // =========================================================================
    // LABS — demo API + các hàm Figma Plugin API thường gặp
    // UI gửi message → main xử lý bằng figma.* → postToUI / notify
    // =========================================================================

    /**
     * import-from-api
     * UI đã fetch HTTP xong và gửi `items` sang đây.
     * Main KHÔNG gọi fetch — chỉ dùng Figma API để vẽ.
     */
    case 'import-from-api': {
      const nodes: SceneNode[] = []
      const row = nextRowIndex
      nextRowIndex += 1

      for (let i = 0; i < msg.items.length; i++) {
        const item = msg.items[i]
        // createFrame — container giống Create tab
        const frame = figma.createFrame()
        frame.name = `API / ${item.title}`
        frame.resize(item.width, item.height)
        frame.x = i * 180
        frame.y = row * CELL
        frame.fills = []
        frame.clipsContent = false

        const rect = figma.createRectangle()
        rect.name = 'Fill'
        rect.resize(item.width, item.height)
        rect.x = 0
        rect.y = 0
        rect.fills = [{ type: 'SOLID', color: hexToRgb(item.color) }]
        // cornerRadius — bo góc (GeometryMixin)
        rect.cornerRadius = 8
        frame.appendChild(rect)

        figma.currentPage.appendChild(frame)
        createdNodeIds.add(frame.id)
        nodes.push(frame)

        try {
          // Label = title; subtitle gắn vào pluginData để demo getPluginData sau
          await upsertCenteredLabel(frame, item.title, 12)
          frame.setPluginData('apiId', String(item.id))
          frame.setPluginData('syncKey', item.syncKey)
          frame.setPluginData('apiSubtitle', item.subtitle)
        } catch (error) {
          figma.notify(
            error instanceof Error ? error.message : 'Label failed',
            { error: true },
          )
        }
      }

      // viewport — zoom/pan tới node vừa tạo
      if (nodes.length > 0) {
        figma.viewport.scrollAndZoomIntoView(nodes)
      }
      // selection — chọn luôn các card vừa import
      figma.currentPage.selection = nodes

      const message = `Imported ${nodes.length} card(s) from My API`
      postToUI({
        type: 'action-done',
        message,
        trackedCount: createdNodeIds.size,
      })
      // notify — toast góc dưới Figma
      figma.notify(message)
      break
    }

    /**
     * collect-selection-for-api
     * Thu thập metadata selection + tên file/page → UI POST lên backend.
     * Dùng: figma.root.name, figma.currentPage.name, node.id/name/type/width/height
     */
    case 'collect-selection-for-api': {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.notify('Select at least one layer')
        break
      }

      postToUI({
        type: 'selection-export-payload',
        // root = document; name thường là tên file
        fileName: figma.root.name,
        pageName: figma.currentPage.name,
        nodes: selection.map((node) => ({
          id: node.id,
          syncKey: node.getPluginData('syncKey') || undefined,
          name: node.name,
          type: node.type,
          width: 'width' in node ? node.width : null,
          height: 'height' in node ? node.height : null,
        })),
      })
      break
    }

    /**
     * clone-selection — SceneNode.clone()
     * Tạo bản sao; đặt lệch phải một chút để dễ thấy.
     */
    case 'clone-selection': {
      const selection = [...figma.currentPage.selection]
      if (selection.length === 0) {
        figma.notify('Select at least one layer')
        break
      }

      const clones: SceneNode[] = []
      for (const node of selection) {
        const copy = node.clone()
        if ('x' in copy) copy.x += 24
        if ('y' in copy) copy.y += 24
        clones.push(copy)
        // Nếu clone frame do plugin tạo — track luôn để Delete all xóa được
        if (createdNodeIds.has(node.id)) {
          createdNodeIds.add(copy.id)
        }
      }
      figma.currentPage.selection = clones
      figma.viewport.scrollAndZoomIntoView(clones)
      const message = `Cloned ${clones.length} layer(s)`
      postToUI({
        type: 'action-done',
        message,
        trackedCount: createdNodeIds.size,
      })
      figma.notify(message)
      break
    }

    /**
     * group-selection — figma.group(nodes, parent)
     * Cần ≥ 2 node; parent thường là currentPage hoặc cùng parent.
     */
    case 'group-selection': {
      const selection = [...figma.currentPage.selection]
      if (selection.length < 2) {
        figma.notify('Select at least 2 layers to group')
        break
      }

      const parent = selection[0].parent ?? figma.currentPage
      const group = figma.group(selection, parent)
      group.name = 'Grouped by plugin'
      figma.currentPage.selection = [group]
      const message = `Grouped ${selection.length} layers`
      postToUI({
        type: 'action-done',
        message,
        trackedCount: createdNodeIds.size,
      })
      figma.notify(message)
      break
    }

    /** zoom-to-selection — viewport.scrollAndZoomIntoView */
    case 'zoom-to-selection': {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.notify('Select at least one layer')
        break
      }
      figma.viewport.scrollAndZoomIntoView([...selection])
      figma.notify('Zoomed to selection')
      break
    }

    /** toggle-selection-visible — node.visible = !node.visible */
    case 'toggle-selection-visible': {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.notify('Select at least one layer')
        break
      }
      for (const node of selection) {
        node.visible = !node.visible
      }
      const message = `Toggled visibility on ${selection.length} layer(s)`
      postToUI({
        type: 'action-done',
        message,
        trackedCount: createdNodeIds.size,
      })
      figma.notify(message)
      break
    }

    /** rename-selection — gán node.name */
    case 'rename-selection': {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.notify('Select at least one layer')
        break
      }
      selection.forEach((node, index) => {
        node.name = `${msg.prefix} ${index + 1}`
      })
      await notifySelection()
      const message = `Renamed ${selection.length} layer(s)`
      postToUI({
        type: 'action-done',
        message,
        trackedCount: createdNodeIds.size,
      })
      figma.notify(message)
      break
    }

    /**
     * clientStorage.setAsync — lưu key/value theo user + plugin
     * Sống qua các lần mở plugin (không gắn vào file .fig).
     */
    case 'storage-set': {
      await figma.clientStorage.setAsync(msg.key, msg.value)
      figma.notify(`Saved clientStorage["${msg.key}"]`)
      postToUI({
        type: 'action-done',
        message: `Saved clientStorage["${msg.key}"]`,
        trackedCount: createdNodeIds.size,
      })
      break
    }

    /** clientStorage.getAsync */
    case 'storage-get': {
      const value = await figma.clientStorage.getAsync(msg.key)
      postToUI({
        type: 'storage-value',
        key: msg.key,
        value: typeof value === 'string' ? value : undefined,
      })
      figma.notify(
        value === undefined
          ? `No value for "${msg.key}"`
          : `Loaded clientStorage["${msg.key}"]`,
      )
      break
    }

    /**
     * sync-storage-get / sync-storage-set
     * UI gọi có requestId — trả sync-storage-result (myApi sync id, không localStorage).
     */
    case 'sync-storage-get': {
      const value = await figma.clientStorage.getAsync(msg.key)
      postToUI({
        type: 'sync-storage-result',
        requestId: msg.requestId,
        value: typeof value === 'string' ? value : undefined,
      })
      break
    }

    case 'sync-storage-set': {
      await figma.clientStorage.setAsync(msg.key, msg.value)
      postToUI({
        type: 'sync-storage-result',
        requestId: msg.requestId,
      })
      break
    }

    /**
     * setPluginData — metadata gắn VÀO node, nằm trong file Figma
     * Namespace theo plugin id; plugin khác không đọc được.
     */
    case 'stamp-plugin-data': {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.notify('Select at least one layer')
        break
      }
      for (const node of selection) {
        node.setPluginData(msg.key, msg.value)
      }
      const message = `Stamped pluginData on ${selection.length} layer(s)`
      postToUI({
        type: 'action-done',
        message,
        trackedCount: createdNodeIds.size,
      })
      figma.notify(message)
      break
    }

    /** getPluginData — đọc lại từ node đầu tiên đang chọn */
    case 'read-plugin-data': {
      const first = figma.currentPage.selection[0]
      if (!first) {
        figma.notify('Select at least one layer')
        break
      }
      const value = first.getPluginData(msg.key)
      postToUI({
        type: 'plugin-data-value',
        key: msg.key,
        value,
      })
      figma.notify(
        value
          ? `pluginData["${msg.key}"] = ${value}`
          : `No pluginData["${msg.key}"]`,
      )
      break
    }

    /**
     * exportAsync — rasterize node thành PNG bytes
     * Main gửi base64 về UI để <img src="data:image/png;base64,...">.
     */
    case 'export-selection-png': {
      const first = figma.currentPage.selection[0]
      if (!first) {
        figma.notify('Select at least one layer')
        break
      }
      // Chỉ SceneNode mới export được (không phải Document/Page)
      if (!('exportAsync' in first)) {
        figma.notify('This node cannot be exported')
        break
      }
      const bytes = await first.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 2 },
      })
      postToUI({
        type: 'export-png-result',
        bytesBase64: uint8ToBase64(bytes),
        nodeName: first.name,
      })
      figma.notify(`Exported PNG · ${first.name}`)
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

/** Đổi Uint8Array (từ exportAsync) → base64 để gửi qua postMessage. */
function uint8ToBase64(bytes: Uint8Array): string {
  // figma.base64Encode có sẵn trên main thread — tiện hơn btoa thủ công
  return figma.base64Encode(bytes)
}
