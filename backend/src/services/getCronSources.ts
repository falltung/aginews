import { createClient } from '@supabase/supabase-js';
import { Source } from '../types/source';
import dotenv from 'dotenv';

dotenv.config();

console.log('Connecting to Supabase with URL:', process.env.SUPABASE_URL);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

export async function getCronSources(): Promise<Source[]> {
  console.log("Fetching sources...")
  try {
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')  // 先查询所有字段以便调试
      .eq('is_active', true);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch sources: ${error.message}`);
    }

    console.log('Raw sources data:', sources);

    if (!sources || sources.length === 0) {
      console.log("No active sources found");
      return [];
    }

    console.log(`Found ${sources.length} active sources:`, sources.map(s => s.url));
    return sources;
  } catch (error) {
    console.error('Error in getCronSources:', error);
    throw error;
  }
}
  