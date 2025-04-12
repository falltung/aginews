import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';

dotenv.config();

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const fs = require('fs');

// 配置 OpenAI 客户端使用 OpenRouter
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function generateNewsletter(rawStories: string) {
  console.log(`Generating newsletter with raw stories (${rawStories.length} characters)...`);

  try {
    const newsletterResponse = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `Given a list of raw AI and LLM-related stories sourced from various platforms, create a concise TL;DR-style email newsletter called 'AGI News' with up to the 10 most interesting and impactful stories in HTML format. Prioritize stories that cover product launches, demos, and innovations in AI/LLM technology. Don't forget links!

The newsletter should have the following structure:

Title: 'AGI News – Your Quick Daily Roundup'
Introduction: A one-sentence overview introducing the daily roundup and the newsletter which is a daily AI newsletter sourced by AI agents & Firecrawl 🔥.
Top X Stories: Select up to 10 most noteworthy stories, each summarized in 1-2 sentences with a clickable headline that links to the source.
Each story summary should briefly convey:

Headline: Capture attention with a short, engaging headline.
Highlights: Mention the key takeaway or significance of the story.
Link: Include a hyperlink to the original source for more information.
Example format for each story:

Headline: [Story Headline]
Summary: Brief, compelling summary of the story's main points or implications 1-2 sentences max.
Link: [Insert link]
Prioritize stories that cover product launches, or timely insights relevant to developers, researchers, and founders. Make sure the language is informative but engaging, keeping the overall tone professional and friendly. Do not include any stories that are not in raw stories or are not AI or LLM related. Try not to repeat stories or mention the same company twice in a row (e.g. if you mentioned Anthropic, don't mention Anthropic immediately again in the next story but can mention them later down the list). Ensure the newsletter is formatted in HTML. Do not include \`\`\`html or \`\`\` in the newsletter.  \n\nHere is the raw stories: ${rawStories}`,
        },
      ],
      model: 'gpt-4o',
    });

    if (!newsletterResponse.choices?.[0]?.message?.content) {
      throw new Error('Failed to generate newsletter: Empty response from OpenAI');
    }

    console.log(`Newsletter generated successfully with ${newsletterResponse.choices[0].message.content.length} characters.`);

    return newsletterResponse.choices[0].message.content;
  } catch (error) {
    console.error('Error generating newsletter:', error);
    throw error; // 重新抛出错误以便上层处理
  }
}

