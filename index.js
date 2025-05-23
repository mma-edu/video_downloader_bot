const { Telegraf } = require('telegraf');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const storage = require('./lib/storage');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Download handler
async function handleDownload(ctx, url, formatId) {
  const tempDir = path.join('/tmp', `dl_${ctx.chat.id}_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const filePath = path.join(tempDir, 'video.mp4');
    await new Promise((resolve, reject) => {
      ytdl(url, { quality: formatId })
        .pipe(fs.createWriteStream(filePath))
        .on('finish', resolve)
        .on('error', reject);
    });

    storage.trackFile(ctx.chat.id, tempDir);
    await ctx.replyWithVideo({ source: fs.createReadStream(filePath) });
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

// Bot commands
bot.start((ctx) => ctx.replyWithMarkdown(
  '🎬 *Video Download Bot*\nSend me a YouTube link!'
));

bot.on('text', async (ctx) => {
  if (!ytdl.validateURL(ctx.message.text)) {
    return ctx.reply('❌ Invalid YouTube URL');
  }

  try {
    const info = await ytdl.getInfo(ctx.message.text);
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    
    await ctx.reply('Choose quality:', {
      reply_markup: {
        inline_keyboard: formats.map(f => [
          { 
            text: `${f.qualityLabel} (${f.container})`, 
            callback_data: `dl:${ctx.message.text}:${f.itag}` 
          }
        ])
      }
    });
  } catch (error) {
    ctx.reply(`❌ Error: ${error.message}`);
  }
});

bot.action(/^dl:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await handleDownload(ctx, ctx.match[1], ctx.match[2]);
});

// Vercel handler
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body, res);
  } else {
    res.status(200).send('Bot running');
  }
};

// Local dev
if (process.env.NODE_ENV === 'development') {
  bot.launch();
  console.log('Bot started locally');
}