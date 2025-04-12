import dotenv from 'dotenv';
import { Resend } from 'resend';
import { getSubscribersBatch } from './supabase';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

// 创建 SMTP 传输器
const createSmtpTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// 创建 Resend 客户端
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
    // 获取最新的 newsletter
    const { data: latestNewsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (newsletterError || !latestNewsletter) {
      throw new Error('Failed to get latest newsletter');
    }

    console.log('Fetching all active subscribers...');
    const subscribers = await getSubscribersBatch(0, 0);
    
    if (!subscribers || subscribers.length === 0) {
      console.log('No active subscribers found');
      return "No active subscribers found";
    }

    console.log(`Found ${subscribers.length} active subscribers`);
    let totalSent = 0;
    let totalFailed = 0;

    for (const subscriber of subscribers) {
      try {
        console.log(`Preparing to send to ${subscriber.email}...`);
        const unsubscribe_link = `https://www.aginews.io/api/unsubscribe?email=${subscriber.email}`;
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(subscriber.email)) {
          throw new Error(`Invalid email format: ${subscriber.email}`);
        }

        // 优先使用 SMTP
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
          console.log('Using SMTP to send email...');
          const transporter = createSmtpTransporter();
          
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: subscriber.email,
            subject: 'AGI News – Your Quick Daily Roundup',
            html: newsletter + `<br><br><a href="${unsubscribe_link}">Unsubscribe</a>`,
          });
        } else if (process.env.RESEND_API_KEY) {
          console.log('Using Resend to send email...');
          await resend.emails.send({
            from: 'AGI News <news@aginews.io>',
            to: subscriber.email,
            subject: 'AGI News – Your Quick Daily Roundup',
            html: newsletter + `<br><br><a href="${unsubscribe_link}">Unsubscribe</a>`,
          });
        } else {
          throw new Error('No email service configured. Please set up either SMTP or Resend.');
        }

        // 记录发送成功
        await supabase
          .from('newsletter_sends')
          .insert({
            newsletter_id: latestNewsletter.id,
            subscriber_id: subscriber.id,
            status: 'sent',
            sent_at: new Date().toISOString()
          });

        totalSent++;
        console.log(`Successfully sent to ${subscriber.email}`);
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        
        // 记录发送失败
        await supabase
          .from('newsletter_sends')
          .insert({
            newsletter_id: latestNewsletter.id,
            subscriber_id: subscriber.id,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            sent_at: new Date().toISOString()
          });

        totalFailed++;
      }
    }

    // 更新 newsletter 状态
    await supabase
      .from('newsletters')
      .update({ status: 'sent' })
      .eq('id', latestNewsletter.id);

    return `Successfully sent newsletter to ${totalSent} subscribers (${totalFailed} failed) on ${new Date().toISOString()}`;
  } catch (error) {
    console.error("Error sending newsletter:", error);
    throw error;
  }
}