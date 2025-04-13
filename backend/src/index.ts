import { handleCron } from "./controllers/cron"
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

// 解析命令行参数
const args = process.argv.slice(2);
const isDebugMode = args.includes('--debug');

async function main() {
  console.log(`Starting process to send newsletter...`);
  await handleCron();
}

if (isDebugMode) {
  console.log('Running in debug mode (direct execution)');
  main().catch(console.error);
} else {
  console.log('Running in production mode (cron scheduled)');
  // 每天 UTC 时间 14:00 执行（对应北京时间 22:00）
  cron.schedule(`0 14 * * *`, async () => {
    console.log(`Starting process to send newsletter...`);
    await handleCron();
  });
}
