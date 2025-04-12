import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { Story } from '../types/story';
import { Source } from '../types/source';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

dotenv.config();

// 配置代理
const proxyConfig = {
  http: process.env.HTTP_PROXY,
  https: process.env.HTTPS_PROXY
};

console.log('Proxy configuration:', {
  http: proxyConfig.http ? 'Configured' : 'Not configured',
  https: proxyConfig.https ? 'Configured' : 'Not configured'
});

// 创建代理 agent
const createProxyAgent = () => {
  if (proxyConfig.https) {
    console.log('Creating HTTPS proxy agent with:', proxyConfig.https);
    return new HttpsProxyAgent(proxyConfig.https);
  }
  console.log('No proxy agent created');
  return undefined;
};

// 设置全局 fetch 配置
const agent = createProxyAgent();
if (agent) {
  console.log('Setting up global fetch with proxy agent');
  // @ts-ignore
  global.fetch = (url: string, options: any = {}) => {
    console.log(`Making request to ${url} through proxy`);
    return fetch(url, {
      ...options,
      agent,
      timeout: 30000,
      retry: {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
      }
    });
  };
} else {
  console.log('Using direct connection (no proxy)');
}

// 配置 Firecrawl 客户端
const app = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
});

// 配置 OpenAI 客户端使用 OpenRouter
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': 'https://aginews.io', // 添加来源
    'X-Title': 'AGI News' // 添加应用名称
  },
  // 如果配置了代理，使用代理
  ...(proxyConfig.https ? {
    httpAgent: new HttpsProxyAgent(proxyConfig.https),
    httpsAgent: new HttpsProxyAgent(proxyConfig.https)
  } : {})
});

export async function scrapeSources(sources: Source[]): Promise<Story[]> {
  const num_sources = sources.length;
  console.log(`Scraping ${num_sources} sources...`)

  let combinedText: { stories: any[] } = { stories: [] };
  const useTwitter = true;
  const useScrape = true;

  for (const source of sources) {
    const sourceUrl = source.url;
    
    if (sourceUrl.includes('x.com')) {
      if (useTwitter) {
        const usernameMatch = sourceUrl.match(/x\.com\/([^\/]+)/);

        if (usernameMatch) {
          const username = usernameMatch[1];
        
          // Construct and encode the query
          const query = `from:${username} has:media -is:retweet -is:reply`;
          const encodedQuery = encodeURIComponent(query);
        
          // 增加时间范围到 48 小时
          const startTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
          const encodedStartTime = encodeURIComponent(startTime);
        
          // 增加抓取数量到 20
          const apiUrl = `https://api.x.com/2/tweets/search/recent?query=${encodedQuery}&max_results=20&start_time=${encodedStartTime}`;
        
          // Fetch recent tweets from the Twitter API
          const response = await fetch(apiUrl, {
            headers: {
              'Authorization': `Bearer ${process.env.X_API_BEARER_TOKEN}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch tweets for ${username}: ${response.statusText}`);
          }
          
          const tweets = await response.json();
          
          if (tweets.meta?.result_count === 0) {
            // No tweets found
          } else if (Array.isArray(tweets.data)) {
            console.log(`Tweets found from username ${username}`);
            const stories = tweets.data.map((tweet: any) => {
              return {
                title: tweet.text.substring(0, 200), // Limit title length
                url: `https://x.com/i/status/${tweet.id}`,
                source_id: source.id,
                content: tweet.text,
                summary: tweet.text.substring(0, 500), // Limit summary length
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            });
            combinedText.stories.push(...stories);
          } else {
            console.error('Expected tweets.data to be an array:', tweets.data);
          }
        }
      }
    } else {
      if (useScrape) {
        let retries = 3;
        let lastError = null;
        
        while (retries > 0) {
          try {
            console.log(`Attempting to scrape ${sourceUrl} (${retries} retries left)...`);
            const scrapeResponse = await app.scrapeUrl(sourceUrl, {
              formats: ['markdown'],
              timeout: 60000 // 60 seconds timeout
            });
            
            if (!scrapeResponse.success) {
              throw new Error(`Failed to scrape: ${scrapeResponse.error}`);
            }

            try {
              // 尝试不同的模型
              const models = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
              let LLMFilterResponse = null;
              let lastModelError = null;

              for (const model of models) {
                try {
                  console.log(`Trying model ${model}...`);
                  LLMFilterResponse = await client.chat.completions.create({
                    messages: [{ role: 'user', content: `Today is ${new Date().toLocaleDateString()}. Return AI or LLM related story or post headlines and links in JSON format from the following scraped content. They can be from today or yesterday. The format should be {"stories": [{"title": "headline1", "url": "link1", "content": "full content", "summary": "brief summary"}]}. If there are no stories or posts related to AI or LLMs, return {"stories": []}. The source link is ${sourceUrl}. If the story or post link is not absolute, make it absolute with the source link. RETURN ONLY JSON IN THE SPECIFIED FORMAT DO NOT INCLUDE MARKDOWN OR ANY OTHER TEXT JUST THE PURE JSON. Do not include \`\`\`json or \`\`\` or any other markdown formatting. Scraped Content:\n\n\n${scrapeResponse.markdown} JSON:` }],
                    model: model,
                  });
                  break; // 如果成功，跳出循环
                } catch (error) {
                  console.error(`Error with model ${model}:`, error);
                  lastModelError = error;
                  continue; // 尝试下一个模型
                }
              }

              if (!LLMFilterResponse) {
                throw lastModelError || new Error('All models failed');
              }

              console.log('OpenAI Response:', JSON.stringify(LLMFilterResponse, null, 2));

              if (!LLMFilterResponse.choices || !LLMFilterResponse.choices[0] || !LLMFilterResponse.choices[0].message || !LLMFilterResponse.choices[0].message.content) {
                throw new Error('Invalid response from OpenAI: Missing content');
              }

              const content = LLMFilterResponse.choices[0].message.content.trim();
              console.log('OpenAI Content:', content);

              if (!content) {
                throw new Error('Empty response from OpenAI');
              }

              let todayStories;
              try {
                todayStories = JSON.parse(content);
              } catch (error) {
                console.error('Failed to parse OpenAI response as JSON:', content);
                throw new Error('Invalid JSON response from OpenAI');
              }

              if (!todayStories || typeof todayStories !== 'object' || !Array.isArray(todayStories.stories)) {
                console.error('Invalid stories format:', todayStories);
                throw new Error('Invalid stories format in OpenAI response');
              }

              console.log(`Found ${todayStories.stories.length} stories from ${sourceUrl}`);
              
              // Add source_id to each story
              todayStories.stories.forEach((story: any) => {
                if (!story.title || !story.url) {
                  console.error('Invalid story format:', story);
                  return; // Skip invalid stories
                }
                story.source_id = source.id;
                story.created_at = new Date().toISOString();
                story.updated_at = new Date().toISOString();
              });
              
              // Filter out invalid stories
              const validStories = todayStories.stories.filter((story: any) => story.title && story.url);
              combinedText.stories.push(...validStories);
              break; // Success, exit retry loop
            } catch (error) {
              console.error(`Error processing scraped content from ${sourceUrl}:`, error);
              lastError = error;
              retries--;
              if (retries > 0) {
                console.log(`Retrying in 5 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          } catch (error) {
            console.error(`Error scraping ${sourceUrl}:`, error);
            lastError = error;
            retries--;
            if (retries > 0) {
              console.log(`Retrying in 5 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }
        
        if (retries === 0 && lastError) {
          console.error(`Failed to scrape ${sourceUrl} after 3 attempts:`, lastError);
          // Continue with next source instead of throwing error
          continue;
        }
      }
    }
  }

  console.log(`Scraped stories: ${combinedText.stories.length}`);
  return combinedText.stories;
}  

