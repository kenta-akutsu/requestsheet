# 日本語IME（Input Method Editor）ハンドリングガイド

## 概要

日本語入力を含むアプリケーションでは、IME（日本語変換）中の `Enter` キーは **文字の確定操作** であり、 **送信操作ではない** 。これは日本国内アプリ共通の挙動であり、全てのテキスト入力コンポーネントで遵守すること。

## 必須ルール

### Enter キーの挙動

| 状態 | Enter の動作 |
|---|---|
| IME変換中（composing） | 変換候補の確定のみ。送信しない |
| 通常入力（not composing） | メッセージ送信 |
| Shift + Enter | 改行（IME状態に関わらず） |

### 実装パターン（React）

```tsx
const isComposingRef = useRef(false)

function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  // IME変換中はEnterで送信しない
  if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
    e.preventDefault()
    handleSend()
  }
}

<textarea
  onCompositionStart={() => { isComposingRef.current = true }}
  onCompositionEnd={() => { isComposingRef.current = false }}
  onKeyDown={handleKeyDown}
/>
```

### なぜ `useRef` を使うか

- `useState` だと `onCompositionEnd` → `onKeyDown` の順序が保証されないブラウザがある
- `useRef` はレンダリングを挟まないため、イベントハンドラ内で即座に最新値を参照できる

## 注意事項

- `e.nativeEvent.isComposing` も参考になるが、ブラウザ間で挙動差がある
- Chrome は `compositionEnd` → `keyDown` の順序で発火するケースがあり、`isComposing` を `useRef` で管理するのが最も安全
- このルールはチャット入力だけでなく、検索バー・コメント入力など **全ての `Enter` で確定する入力欄** に適用すること

## 適用箇所（本プロジェクト）

- `components/features/chat/ChatWindow.tsx` — メインチャット入力 + メッセージ編集
- 今後追加する入力コンポーネント全てに同様の対応を入れること
