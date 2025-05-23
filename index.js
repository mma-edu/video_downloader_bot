const { Telegraf } = require('telegraf');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const storage = require('./lib/storage');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// Download handler
async function downloadVideo(ctx, url, formatId) {
  const tempDir = path.join('/tmp', `dl_${ctx.chat.id}_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const msg = await ctx.reply('⏳ Downloading... (this may take a few minutes)');
    const filePath = path.join(tempDir, 'video.mp4');

    await new Promise((resolve, reject) => {
      ytdl(url, { quality: formatId })
        .pipe(fs.createWriteStream(filePath))
        .on('finish', resolve)
        .on('error', reject);
    });

    storage.trackFile(ctx.chat.id, tempDir);
    return filePath;
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

// Bot commands
bot.start((ctx) => ctx.replyWithMarkdown(
  '👋 *Social Media Video Downloader*\nSend me a video link to get started!'
));

bot.on('text', async (ctx) => {
  const url = ctx.message.text.trim();
  
  if (!ytdl.validateURL(url)) {
    return ctx.reply('❌ Invalid YouTube URL');
  }

  try {
    const info = await ytdl.getInfo(url);
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    
    const buttons = formats.map(format => [
      {
        text: `${format.qualityLabel} (${format.container})`,
        callback_data: `download:${url}:${format.itag}`
      }
    ]);

    await ctx.reply('Select quality:', {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (error) {
    ctx.reply(`❌ Error: ${error.message}`);
  }
});

bot.action(/^download:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const [url, formatId] = ctx.match.slice(1);

  try {
    const filePath = await downloadVideo(ctx, url, formatId);
    await ctx.replyWithVideo({ source: fs.createReadStream(filePath) });
  } catch (error) {
    ctx.reply(`❌ Download failed: ${error.message}`);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error:`, err);
  ctx.reply('❌ An error occurred');
});

// Vercel handler
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body, res);
  } else {
    res.status(200).send('Bot is running');
  }
};

// Local development
if (process.env.NODE_ENV === 'development') {
  bot.launch();
  console.log('Bot started in dev mode');
}