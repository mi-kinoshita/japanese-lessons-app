import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Message } from '../types/message';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Call the Gemini API through Supabase Edge Function
 * @param messages - The message history to send to the API
 * @returns A promise that resolves to the AI response text
 */
export async function callGeminiAPI(messages: Message[]): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { messages },
    });

    if (error) {
      console.error('Supabase Edge Function error:', error);
      throw new Error(`Supabase Edge Function error: ${error.message}`);
    }

    if (!data || !data.text) {
      throw new Error('Invalid response from AI service');
    }

    return data.text;
  } catch (error) {
    console.error('Failed to call Gemini API via Supabase:', error);
    throw error;
  }
}

export default supabase;