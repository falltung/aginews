import dotenv from 'dotenv';
import { Resend } from 'resend';
import { getSubscribersBatch } from './supabase';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNewsletter(newsletter: string, rawStories: string) {
  if (!newsletter || newsletter.length <= 500) {
    console.log("Newsletter is too short to send. See newsletter below:");
    console.log(newsletter);
    console.log("Raw stories below:");
    console.log(rawStories);
    return "Newsletter not sent due to insufficient length.";
  }

  try {
    console.log('Fetching all active subscribers...');
    const subscribers = await getSubscribersBatch(0, 0); // 参数不再使用，但为了兼容性保留
    
    if (!subscribers || subscribers.length === 0) {
      console.log('No active subscribers found');
      return "No active subscribers found";
    }

    console.log(`Found ${subscribers.length} active subscribers`);
    let totalSent = 0;

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

    return `Successfully sent newsletter to ${totalSent} subscribers on ${new Date().toISOString()}`;
  } catch (error) {
    console.error("Error sending newsletter:", error);
    throw error;
  }
}