import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { Story } from '../types/story';
import { Source } from '../types/source';
import { Subscriber } from '../types/subscriber';
import { Newsletter } from '../types/newsletter';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function getSources(): Promise<Source[]> {
  console.log('Fetching sources from Supabase...');
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching sources:', error);
    throw error;
  }

  console.log(`Found ${data.length} active sources`);
  return data;
}

export async function saveStories(stories: Story[]): Promise<void> {
  console.log(`Saving ${stories.length} stories to Supabase...`);
  const { error } = await supabase
    .from('stories')
    .upsert(stories, { onConflict: 'url' });

  if (error) {
    console.error('Error saving stories:', error);
    throw error;
  }
  console.log('Successfully saved stories to Supabase');
}

export async function getSubscribersBatch(offset: number, limit: number): Promise<Subscriber[]> {
  console.log(`Fetching subscribers batch starting at ${offset} with limit ${limit}...`);
  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .eq('is_active', true)
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching subscribers:', error);
    throw error;
  }

  console.log(`Found ${data.length} subscribers in this batch`);
  return data;
}

export async function saveNewsletter(newsletter: Newsletter): Promise<void> {
  console.log('Saving newsletter to Supabase...');
  const { error } = await supabase
    .from('newsletters')
    .insert(newsletter);

  if (error) {
    console.error('Error saving newsletter:', error);
    throw error;
  }
  console.log('Successfully saved newsletter to Supabase');
}

export async function getLatestNewsletter(): Promise<Newsletter | null> {
  console.log('Fetching latest newsletter from Supabase...');
  const { data, error } = await supabase
    .from('newsletters')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest newsletter:', error);
    throw error;
  }

  console.log(data.length > 0 ? 'Found latest newsletter' : 'No newsletters found');
  return data[0] || null;
}

export async function getStoriesForNewsletter(): Promise<Story[]> {
  console.log('Fetching stories for newsletter from Supabase...');
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching stories for newsletter:', error);
    throw error;
  }

  console.log(`Found ${data.length} stories for newsletter`);
  return data;
}

export async function markNewsletterAsSent(newsletterId: number): Promise<void> {
  console.log(`Marking newsletter ${newsletterId} as sent...`);
  const { error } = await supabase
    .from('newsletters')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', newsletterId);

  if (error) {
    console.error('Error marking newsletter as sent:', error);
    throw error;
  }
  console.log('Successfully marked newsletter as sent');
} 