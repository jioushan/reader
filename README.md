# Reader

A lightweight web-based PDF & EPUB reader. Self-hosted, privacy-friendly, no account required.

轻量级网页 PDF/EPUB 阅读器。可自托管，无需注册，保护隐私。

軽量ウェブ PDF/EPUB リーダー。セルフホスト可能、アカウント不要、プライバシー重視。

---

## Features / 功能 / 機能

- PDF & EPUB rendering in browser / 浏览器内渲染 PDF 和 EPUB / ブラウザで PDF・EPUB をレンダリング
- Import from local file or URL / 本地上传或从 URL 导入 / ローカルファイルまたはURLからインポート
- Reading progress & bookmarks / 阅读进度与书签 / 読み進捗・ブックマーク
- Fullscreen mode with touch & volume key support / 全屏模式支持触摸和音量键翻页 / タッチ・音量キー対応のフルスクリーンモード
- Multiple themes (Blue / White / Dark / Green) / 多主题切换（浅蓝/纯白/黑色/绿色） / テーマ切替（ブルー/ホワイト/ダーク/グリーン）
- 7 languages (EN / 中文 / 日本語 / 한국어 / FR / ES / DE) / 7种语言 / 7言語対応
- Custom font upload / 自定义字体上传 / カスタムフォント対応
- Responsive design for desktop & mobile / 桌面端与移动端响应式设计 / デスクトップ・モバイル対応レスポンシブデザイン

## Quick Start / 快速开始 / クイックスタート

### Docker Compose (recommended / 推荐 / おすすめ)

```bash
# Clone / 克隆 / クローン
git clone https://github.com/jioushan/reader.git
cd reader

# Put your PDF/EPUB files here / 把 PDF/EPUB 放入此目录 / PDF/EPUB をここに配置
mkdir library

# Start / 启动 / 起動
docker compose up -d
```

Open `http://localhost:40102` in your browser.

打开浏览器访问 `http://localhost:40102`。

ブラウザで `http://localhost:40102` を開く。

### Update / 更新 / アップデート

```bash
docker compose pull
docker compose up -d
```

### Docker Hub Pull / 直接拉取镜像 / イメージを直接プル

If the image is published to ghcr.io:

ghcr.io 有预构建镜像时可直接使用：

ghcr.io にイメージがある場合：

```yaml
# docker-compose.yml
services:
  reader:
    image: ghcr.io/jioushan/reader:latest
    ports:
      - "40102:40102"
    volumes:
      - ./library:/app/public/library
    environment:
      - PORT=40102
      - LIBRARY_DIR=/app/public/library
    restart: unless-stopped
```

## Environment Variables / 环境变量 / 環境変数

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `40102` | Server port / 服务端口 / サーバーポート |
| `LIBRARY_DIR` | `./public/library` | Directory for PDF/EPUB files / PDF/EPUB 文件目录 / PDF/EPUB ファイルディレクトリ |

## Tech Stack / 技术栈 / 技術スタック

- [Preact](https://preactjs.com/) — UI framework
- [pdf.js](https://mozilla.github.io/pdf.js/) — PDF rendering
- [epub.js](https://github.com/futurepress/epub.js) — EPUB rendering
- [Vite](https://vitejs.dev/) — Build tool
- Node.js — Production server

## License / 许可证 / ライセンス

[MIT](./LICENSE)
