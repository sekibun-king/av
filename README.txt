AV辞典 APIなし試作版

使い方:
1. index.html をブラウザで開く
2. 作品を追加
3. 検索・人物ページ・タグページを確認

保存先:
- データはブラウザの localStorage に保存されます。
- 別端末に移す場合は「バックアップ」からJSONを書き出してください。

PWA化:
- Vercel / Netlify / GitHub Pages などHTTPS上に置くと、manifest と service worker によりホーム画面追加しやすくなります。
- ローカルファイルとして開いた場合、PWAインストールは環境により使えません。
