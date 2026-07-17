/** Messages exchanged between the React UI (iframe) and the main plugin thread. */

export type HexColor = `#${string}`

/** Item đã fetch từ "My API" — UI gửi sang main để vẽ. */
export type ApiImportItem = {
  id: number
  /** Khóa ổn định để merge khi push — không đổi khi resize. */
  syncKey: string
  title: string
  subtitle: string
  color: HexColor
  width: number
  height: number
}

/** Metadata 1 node — main thu thập rồi UI POST lên API. */
export type SelectionExportNode = {
  id: string
  /** Khớp với syncKey trên API để update đúng 1 phần tử, không ghi đè cả list. */
  syncKey?: string
  name: string
  type: string
  width: number | null
  height: number | null
}

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
  // --- Labs / demo API + Figma Plugin API ---
  /** UI đã fetch API xong → nhờ main tạo card trên canvas. */
  | { type: 'import-from-api'; items: ApiImportItem[] }
  /** Main đọc selection + file/page name → trả về UI để POST API. */
  | { type: 'collect-selection-for-api' }
  /** clone() — nhân bản selection. */
  | { type: 'clone-selection' }
  /** group() — gom selection thành 1 Group. */
  | { type: 'group-selection' }
  /** viewport.scrollAndZoomIntoView */
  | { type: 'zoom-to-selection' }
  /** Đổi visible của từng node đang chọn. */
  | { type: 'toggle-selection-visible' }
  /** Đổi name theo prefix. */
  | { type: 'rename-selection'; prefix: string }
  /** clientStorage — lưu chuỗi bất kỳ (sống qua lần mở plugin). */
  | { type: 'storage-set'; key: string; value: string }
  | { type: 'storage-get'; key: string }
  /** UI ↔ clientStorage có requestId (dùng cho myApi sync id). */
  | { type: 'sync-storage-get'; key: string; requestId: string }
  | { type: 'sync-storage-set'; key: string; value: string; requestId: string }
  /** setPluginData / getPluginData trên node đang chọn. */
  | { type: 'stamp-plugin-data'; key: string; value: string }
  | { type: 'read-plugin-data'; key: string }
  /** exportAsync → PNG base64 gửi về UI. */
  | { type: 'export-selection-png' }

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
  /** Payload để UI gọi pushSelectionToMyApi(). */
  | {
      type: 'selection-export-payload'
      fileName: string
      pageName: string
      nodes: SelectionExportNode[]
    }
  /** Kết quả clientStorage.getAsync. */
  | { type: 'storage-value'; key: string; value: string | undefined }
  /** Trả lời sync-storage-get / sync-storage-set. */
  | { type: 'sync-storage-result'; requestId: string; value?: string }
  /** Kết quả getPluginData. */
  | { type: 'plugin-data-value'; key: string; value: string }
  /** PNG đã export (base64, không có prefix data:). */
  | { type: 'export-png-result'; bytesBase64: string; nodeName: string }

export type DeleteScope = 'created' | 'selection'
