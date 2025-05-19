// api/reports.ts

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// 報告用 Edge Function の URL (Edge Function 名が 'report-message' の場合)
const REPORT_FUNCTION_URL = `${supabaseUrl}/functions/v1/report-message`;

// 報告データに必要な型定義
interface ReportData {
  device_id: string;
  conversation_id: string;
  message_text: string;
  message_timestamp?: string; // message_time (timestamp with time zone) に対応
  reason: string;
}

/**
 * 不適切なメッセージを Supabase Edge Function 経由で報告する
 * @param reportData 報告データ
 * @returns 報告成功メッセージ
 * @throws エッジ関数呼び出しエラー
 */
export async function reportInappropriateMessage(reportData: ReportData): Promise<string> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is not set.");
    throw new Error('Configuration Error: Supabase URL or Anon Key is not set.');
  }

  try {
    console.log('Reporting message to Edge Function...');
    const response = await fetch(REPORT_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Edge Function の認証設定によりますが、通常は Anon Key を Authorization ヘッダーに含めます。
        // Service Role Key は Edge Function 内部でのみ使用されるべきです。
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(reportData),
    });

    // Edge Function から 200 OK 以外の応答が返された場合
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Report Function Error Response:', response.status, errorBody);
      let errorMessage = `Failed to submit report: ${response.status}`;
      try {
         const errorJson = JSON.parse(errorBody);
         if(errorJson.error) errorMessage += ` - ${errorJson.error}`;
      } catch (e) {
         errorMessage += ` - ${errorBody}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Report Function Success Response:', result);
    return result.message || '報告が完了しました。'; // Edge Function の応答メッセージを使用

  } catch (error) {
    console.error('Error calling report Edge Function:', error);
    // ネットワークエラーなど、fetch自体が失敗した場合
    throw new Error(`報告中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}