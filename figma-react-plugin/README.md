# Figma Plugin với React

Tài liệu chi tiết hơn: xem [docs/figma-plugin-react-overview.md](./docs/figma-plugin-react-overview.md) (bản tóm tắt để gửi đi).

Tóm tắt siêu ngắn:

1. **Hai runtime:** UI (React) + Main (`figma.*`) — chỉ nói chuyện bằng `postMessage`.
2. **Local:** build → Import `manifest.json` trong Figma Desktop → Development.
3. **Canvas:** mọi thao tác document ở Main; UI gửi lệnh qua message.
4. **HTTP:** thường `fetch` ở UI; whitelist domain trong `networkAccess`.
5. Docs chính thức: [developers.figma.com/docs/plugins](https://developers.figma.com/docs/plugins/).
