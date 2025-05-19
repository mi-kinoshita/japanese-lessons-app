// supabase/functions/call-gemini/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ★ URL を Gemini 2.0 Flash-Lite (generateContent メソッド) に変更
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const { messages } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
       console.error("GEMINI_API_KEY not set in Supabase Secrets.");
       return new Response(JSON.stringify({ error: 'Server configuration error: API key missing' }), {
         status: 500,
         headers: { 'Content-Type': 'application/json' },
       });
    }

    const formattedMessages = messages.map((msg: any) => ({
      role: msg.sender === 'ai' ? 'model' : msg.sender,
      parts: [{ text: msg.text }],
    }));

    const requestBody = JSON.stringify({
      contents: formattedMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        // 他のカテゴリも必要であれば追加
      ],
    });

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: requestBody,
    });

    if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.text();
        console.error('Gemini API error response:', geminiResponse.status, errorBody);
        return new Response(JSON.stringify({ error: `Gemini API error: ${geminiResponse.status} - ${errorBody}` }), {
            status: geminiResponse.status >= 400 && geminiResponse.status < 500 ? 400 : 500, // 4xx系はクライアントエラー、他はサーバーエラーとして返す
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const geminiData = await geminiResponse.json();

    const aiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '応答を取得できませんでした。';

    // aiText が null, undefined, 空文字列などでないことを確認してから返す
    if (typeof aiText !== 'string' || aiText.trim() === '') {
         console.error('Gemini API response format unexpected or returned empty text:', JSON.stringify(geminiData));
         return new Response(JSON.stringify({ error: 'AI response format error' }), {
             status: 500,
             headers: { 'Content-Type': 'application/json' },
         });
     }


    return new Response(JSON.stringify({
      text: aiText
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function runtime error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal Server Error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});