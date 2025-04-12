import dotenv from 'dotenv';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

export async function sendNewsletter(newsletter: string, rawStories: string) {
  if (!newsletter || newsletter.length <= 500) {
    console.log("Newsletter is too short to send. See newsletter below:");
    console.log(newsletter);
    console.log("Raw stories below:");
    console.log(rawStories);
    return "Newsletter not sent due to insufficient length.";
  }

  try {
    const batchSize = 50;
    let start = 0;
    let hasMore = true;
    let totalSent = 0;

    while (hasMore) {
      console.log(`Fetching subscribers batch starting at ${start}...`);
      const { data: subscribers, error } = await supabase
        .from('subscribers')
        .select('email')
        .eq('is_active', true)
        .range(start, start + batchSize - 1);

      if (error) {
        console.error('Error fetching subscribers:', error);
        throw new Error(`Failed to fetch subscribers: ${error.message}`);
      }

      console.log(`Found ${subscribers?.length || 0} subscribers in this batch`);

      if (!subscribers || subscribers.length === 0) {
        hasMore = false;
        continue;
      }

      console.log(`Sending newsletter to ${subscribers.length} subscribers`);

      for (const subscriber of subscribers) {
        const unsubscribe_link = `https://www.aginews.io/api/unsubscribe?email=${subscriber.email}`;
       
        await resend.emails.send({
          from: 'Eric <eric@tryfirecrawl.com>',
          to: subscriber.email,
          subject: 'AGI News – Your Quick Daily Roundup',
          html: newsletter + `<br><br><a href="${unsubscribe_link}">Unsubscribe</a>`,
        });
        
        totalSent++;
        console.log(`Sent to ${subscriber.email}`);
      }

      if (subscribers.length < batchSize) {
        hasMore = false;
      } else {
        start += batchSize;
      }
    }

    return `Successfully sent newsletter to ${totalSent} subscribers on ${new Date().toISOString()}`;
  } catch (error) {
    console.error("Error sending newsletter:", error);
    throw error;
  }
}