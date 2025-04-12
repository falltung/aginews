import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

async function insertTestData() {
  try {
    // 先创建表
    const { error: createError } = await supabase.rpc('create_table_if_not_exists', {
      sql: `
        CREATE TABLE IF NOT EXISTS sources (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          url VARCHAR(255) NOT NULL,
          identifier VARCHAR(255) NOT NULL UNIQUE,
          type VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createError) {
      console.error('Error creating table:', createError);
      return;
    }

    // 插入测试数据
    const { data, error } = await supabase
      .from('sources')
      .upsert([
        {
          name: 'Hacker News',
          url: 'https://news.ycombinator.com',
          identifier: 'hackernews',
          type: 'web',
          is_active: true
        },
        {
          name: 'ArXiv AI',
          url: 'https://arxiv.org/list/cs.AI/recent',
          identifier: 'arxiv_ai',
          type: 'web',
          is_active: true
        },
        {
          name: 'TechCrunch AI',
          url: 'https://techcrunch.com/tag/artificial-intelligence/',
          identifier: 'techcrunch_ai',
          type: 'web',
          is_active: true
        }
      ], { onConflict: 'identifier' });

    if (error) {
      console.error('Error inserting data:', error);
      return;
    }

    console.log('Test data inserted successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

insertTestData(); 