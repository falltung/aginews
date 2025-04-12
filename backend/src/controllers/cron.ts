import { scrapeSources } from '../services/scrapeSources';
import { getCronSources } from '../services/getCronSources';
import { generateNewsletter } from '../services/generateNewsletter'
import { sendNewsletter } from '../services/sendNewsletter'
import { saveStories } from '../services/supabase'
import { saveNewsletter } from '../services/supabase'
import { Newsletter } from '../types/newsletter'
import fs from 'fs';

export const handleCron = async (): Promise<void> => {
  try {
    console.log('Starting cron job...');
    
    // Get sources and scrape stories
    const cronSources = await getCronSources();
    console.log('Got cron sources:', cronSources);
    
    const rawStories = await scrapeSources(cronSources);
    console.log('Scraped stories:', rawStories.length);
    
    // Save stories to Supabase
    await saveStories(rawStories);
    console.log('Saved stories to Supabase');
    
    // Generate and save newsletter
    const rawStoriesString = JSON.stringify(rawStories);
    const newsletter = await generateNewsletter(rawStoriesString);
    console.log('Generated newsletter');
    
    if (newsletter) {
      await saveNewsletter(newsletter);
      console.log('Saved newsletter to Supabase');
    }
    
    // Send newsletter
    const result = await sendNewsletter(newsletter.content, rawStoriesString);
    console.log('Newsletter sending result:', result);
  } catch (error) {
    console.error('Error in cron job:', error);
  }
}