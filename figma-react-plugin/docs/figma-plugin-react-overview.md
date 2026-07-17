# Figma Plugin + React — tài liệu tóm tắt

Tài liệu ngắn để chia sẻ: kiến trúc, cài đặt, và cách tương tác với Figma.

---

## 1. Kiến trúc

Plugin Figma gồm **hai phần** chạy song song:

| | Main thread | UI |
|---|-------------|-----|
| Vai trò | Thao tác canvas / document | Giao diện (form, nút,…) |
| Công nghệ | JS/TS + `figma.*` | React (hoặc framework khác) |
| Không được | DOM, gọi UI trực tiếp | Gọi `figma.*` trực tiếp |

Hai bên chỉ nói chuyện qua **`postMessage`**.

```
Người dùng → UI (React) → message → Main (figma.*) → Canvas
                 ↓
              fetch (API backend) — nếu cần
```

---

## 2. Cài đặt & chạy local

**Cần:** Figma Desktop, Node.js (Vite hiện đại thường cần Node ≥ 20).

1. Tạo project: UI (React) + file main (Plugin API).
2. `manifest.json` trỏ tới file đã build:
   - `"main"`: script main (vd. `dist/code.js`)
   - `"ui"`: HTML iframe (vd. `dist/index.html`)
3. Build UI + main.
4. Figma → **Plugins → Development → Import plugin from manifest…**
5. Chạy plugin từ Development; sau mỗi lần sửa code → build lại → reload plugin.

**manifest (các field quan trọng):**

- `documentAccess: "dynamic-page"` → đọc node bằng API async (`getNodeByIdAsync`, …).
- `networkAccess.allowedDomains` → whitelist host khi UI gọi HTTP.

**Build:** thường tách 2 bước — bundle UI thành 1 HTML (inline JS/CSS), bundle main thành 1 file JS.

### Sau khi publish

Khi hoàn thiện, plugin có thể publish lên **Figma Community** (public) hoặc chia sẻ nội bộ trong **organization** (private). Khác biệt so với dev local:

| | Dev local (import manifest) | Sau khi publish |
|---|---|---|
| Cách chạy | Import `manifest.json` thủ công | Cài từ Community / org rồi chạy như plugin bình thường |
| Ai dùng được | Chỉ máy đã import | Mọi người (public) hoặc thành viên org (private) |
| Nền tảng | Cần Figma Desktop | Chạy cả trên **Figma Web** lẫn Desktop |
| Cập nhật | Build lại + reload | Publish **phiên bản mới** → user tự nhận bản cập nhật |
| Code | Chạy từ file local | Figma lưu & phân phối bản đã build |

**Lưu ý khi publish:**

- Cần **tài khoản** phù hợp; plugin qua **review** của Figma trước khi lên public.
- Chuẩn bị metadata: tên, mô tả, icon, ảnh cover, tags.
- `networkAccess.allowedDomains` phải khai báo **đầy đủ** domain thật — sau publish không "vá nóng" được, phải publish bản mới.
- Build **production** (minify, bỏ log/dev code).
- Không nhúng secret/API key trong code UI (ai cũng đọc được); dùng backend trung gian nếu cần bảo mật.
- Mỗi lần sửa: **publish update** → user nhận version mới (không cần import lại thủ công).

---

## 3. Giao tiếp UI ↔ Main

**UI gửi xuống:**

```js
parent.postMessage({ pluginMessage: { type: '…', /* data */ } }, '*')
```

**Main nhận / gửi lên:**

```js
figma.ui.onmessage = async (msg) => { /* xử lý msg.type */ }
figma.ui.postMessage({ type: '…', /* data */ })
```

**UI lắng nghe:**

```js
window.addEventListener('message', (e) => {
  const msg = e.data?.pluginMessage
})
```

Nên dùng **message typed** (TypeScript) dùng chung cho cả hai bên.

**Lưu ý UI iframe:** không dùng `localStorage`; một số Web API có thể thiếu; network chỉ domain đã whitelist.

---

## 4. Tương tác với Figma (Main)

Mọi thao tác document nằm ở main. Ví dụ nhóm API:

| Việc | API gợi ý |
|------|-----------|
| Mở UI | `figma.showUI(html, { width, height })` |
| Tạo layer | `createRectangle`, `createFrame`, `createText`, … |
| Sửa | `resize`, `fills`, `name`, `visible`, … |
| Selection | `figma.currentPage.selection` |
| Zoom | `figma.viewport.scrollAndZoomIntoView` |
| Text | `loadFontAsync` rồi mới set `characters` |
| Clone / group / xóa | `clone()`, `figma.group()`, `remove()` |
| Lưu theo user | `figma.clientStorage` |
| Metadata trên node | `setPluginData` / `getPluginData` |
| Export ảnh | `exportAsync` |
| Thông báo / đóng | `notify`, `closePlugin`, `ui.resize` |

**Text:** luôn `await figma.loadFontAsync(…)` trước khi gán nội dung.

**HTTP:** thường `fetch` ở UI → gửi data xuống main để vẽ/cập nhật canvas (hoặc ngược lại: main lấy selection → UI POST lên backend).

---

## 5. Nguyên tắc thiết kế

1. UI chỉ lo giao diện + network; main lo canvas.  
2. Message nhỏ, rõ `type`, dễ mở rộng.  
3. Không gắn logic Plugin API vào component React.  
4. Đổi API host → cập nhật `networkAccess` trong manifest.  

---

## 6. Tài liệu chính thức

- https://developers.figma.com/docs/plugins/  
- https://developers.figma.com/docs/plugins/how-plugins-run/  
- https://developers.figma.com/docs/plugins/creating-ui/  
- https://developers.figma.com/docs/plugins/api/api-overview/  
- https://developers.figma.com/docs/plugins/manifest/  
