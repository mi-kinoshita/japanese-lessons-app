// api/gemini.ts - Supabase Edge Function 経由で Gemini API を呼び出すコード

import { Message } from '../types/message';

// Supabase のプロジェクト URL と Anon Key は環境変数から取得
// アプリの `.env` ファイルに以下を正しく設定してください。
// EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
// EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Supabase Edge Function の URL を構築します。
// Edge Function の名前を 'call-gemini' とした場合の例です。
// 実際のEdge Function名に合わせて 'call-gemini' 部分は変更してください。
// ローカルテスト時はここを一時的に localhost に変更します。
const edgeFunctionUrl = `${supabaseUrl}/functions/v1/call-gemini`;


// Edge Function を呼び出して Gemini API の応答を取得する関数
// apiKey は Edge Function 側で Secrets から取得するため不要
export async function callGeminiAPI(messages: Message[]): Promise<string> {
  // Edge Function を呼び出す前に、Supabase のキーが環境変数に設定されているか確認
  if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL または Anon Key が設定されていません。");
      throw new Error("Supabase 設定エラー: URL または Anon Key が見つかりません。");
   }

  try {
    console.log('Supabase Edge Function を経由して Gemini API を呼び出しています...');
    // console.log('Edge Function に送信するメッセージ履歴:', messages); // デバッグ用

    // Edge Function に POST リクエストを送信
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Edge Function を呼び出す認証に Supabase Anon Key を Authorization ヘッダーで使用
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      // Edge Function に渡すデータ。{ messages: [...] } 形式を想定
      body: JSON.stringify({ messages: messages }),
    });

    // Edge Function からの応答が成功 (status 2xx) か確認
    if (!response.ok) {
      const errorBody = await response.text(); // Edge Function からのエラー内容を確認
      console.error('Edge Function からエラー応答:', response.status, errorBody);
      // エラーメッセージに Edge Function から返されたエラーボディを含める
      throw new Error(`Edge Function エラー (${response.status}): ${errorBody}`);
    }

    // Edge Function からの成功応答を JSON としてパース
    const data = await response.json();
    console.log('Edge Function からの応答を受信しました。');
    // console.log('Edge Function response data:', data); // デバッグ用

    // Edge Function 側のコード例では { text: aiText } 形式を返しています。
    // その形式に合わせて応答テキストを抽出
    const aiText = data?.text;

    // 抽出した応答テキストが期待する形式か確認
    // null, undefined, 空文字列も無効と判断
    if (typeof aiText !== 'string' || aiText.trim() === '') {
       console.error('Edge Function からの応答形式が不正です、または空です:', JSON.stringify(data));
       // 形式不正またはテキストが空の場合もエラーとする
       throw new Error('AIサービスからの応答形式が不正です。');
    }

    // 抽出したテキスト（AIの応答）を返す
    return aiText;

  } catch (error) {
    // Edge Function の呼び出し自体で発生したネットワークエラーや、上記で throw したエラーを捕捉
    console.error('Supabase Edge Function 呼び出しエラー:', error);
    // エラーを再度スローし、呼び出し元 (ChatScreen) で処理させる
    throw error;
  }
}