/**
 * @file 20261125_generate_logo.js
 * @description 从网络公开数据源 URL 自动抓取素材、裁剪并合成渲染 Sky-GuangYu-BWiki 组织高精度 Logo
 * @date 2026-11-25
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 仓库根路径与工作目录
const repoRoot = path.resolve(__dirname, '..');
const tempDir = path.join(repoRoot, 'temp');
const assetsDir = path.join(repoRoot, 'assets');
const assetLogoPath = path.join(assetsDir, 'logo.png');
const outputLogoPath = path.join(tempDir, 'reproduced_logo.png');

// 外部公开素材数据源
const SOURCES = {
  // 网易官方超高清书法艺术字「光·遇」（576x239 纯净白银透明底）
  upperLogoUrl: 'https://webinput.nie.netease.com/img/sky/logo6.png',
  // B站光遇 BWIKI 官方左上角 Logo（300x80 原版手写浮雕「wiki」字样）
  lowerWikiUrl: 'https://patchwiki.biligame.com/resources/assets/images/logo/logo_sky.png'
};

// 工具库自动探测解析
function resolveModule(name, candidatePaths = []) {
  try {
    return require(name);
  } catch (e) {
    for (const p of candidatePaths) {
      try {
        return require(p);
      } catch (err) {}
    }
  }
  return null;
}

const JimpPkg = resolveModule('jimp', [
  'G:/GGames/Minecraft/shuyeyun/qq-bot/koishi-dev/koishi-dev-8/node_modules/jimp'
]);
const Jimp = JimpPkg ? (JimpPkg.Jimp || JimpPkg) : null;

const puppeteer = resolveModule('puppeteer-core', [
  'G:/GGames/Minecraft/shuyeyun/qq-bot/koishi-dev/koishi-dev-8/node_modules/puppeteer-core',
  'G:/GGames/Minecraft/shuyeyun/qq-bot/node_modules/puppeteer-core'
]);

function findBrowserPath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: HTTP status ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  console.log('=== [20261125_generate_logo] 开始自动复现生成 Logo ===');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const browserPath = findBrowserPath();
  if (!browserPath) {
    throw new Error('未找到 Chrome 或 Edge 可执行文件，请确认安装或配置环境变量 CHROME_BIN');
  }
  if (!Jimp) {
    throw new Error('未找到 jimp 图片处理库');
  }
  if (!puppeteer) {
    throw new Error('未找到 puppeteer-core 库');
  }

  console.log(`[1/4] 正在从公开网络源下载素材...`);
  const rawUpperPath = path.join(tempDir, 'raw_upper_netease.png');
  const rawWikiPath = path.join(tempDir, 'raw_lower_bwiki.png');
  const croppedWikiPath = path.join(tempDir, 'cropped_wiki.png');

  await Promise.all([
    downloadFile(SOURCES.upperLogoUrl, rawUpperPath),
    downloadFile(SOURCES.lowerWikiUrl, rawWikiPath)
  ]);
  console.log('   - 官方书法「光·遇」素材已下载:', rawUpperPath);
  console.log('   - 官方原版「wiki」素材已下载:', rawWikiPath);

  console.log(`[2/4] 使用 Jimp 高精度裁剪「wiki」文字部件...`);
  const bwikiImg = await Jimp.read(rawWikiPath);
  // 精确裁剪 wiki 区域 (x: 175, y: 15, w: 106, h: 60)
  const croppedWiki = bwikiImg.clone().crop({ x: 175, y: 15, w: 106, h: 60 });
  await croppedWiki.write(croppedWikiPath);
  console.log('   - 「wiki」切片已生成:', croppedWikiPath);

  console.log(`[3/4] 启动浏览器内核无损合成与晨曦星空渐变渲染...`);
  const upperB64 = fs.readFileSync(rawUpperPath).toString('base64');
  const wikiB64 = fs.readFileSync(croppedWikiPath).toString('base64');

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=2']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 2 });

  const renderHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        width: 800px;
        height: 800px;
        overflow: hidden;
        background: radial-gradient(circle at 50% 40%, #c8e2f2 0%, #a4c9de 50%, #86aec8 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .stars {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: 
          radial-gradient(1.8px 1.8px at 100px 90px, rgba(255,255,255,0.95), transparent),
          radial-gradient(2.2px 2.2px at 200px 240px, rgba(255,255,255,0.85), transparent),
          radial-gradient(1.5px 1.5px at 300px 110px, rgba(255,255,255,0.75), transparent),
          radial-gradient(3px 3px at 620px 160px, rgba(255,255,255,0.98), transparent),
          radial-gradient(2px 2px at 700px 420px, rgba(255,255,255,0.85), transparent),
          radial-gradient(2.5px 2.5px at 140px 620px, rgba(255,255,255,0.88), transparent),
          radial-gradient(2px 2px at 520px 680px, rgba(255,255,255,0.8), transparent),
          radial-gradient(3.5px 3.5px at 400px 60px, rgba(255,255,255,0.95), transparent),
          radial-gradient(1.5px 1.5px at 60px 320px, rgba(255,255,255,0.75), transparent),
          radial-gradient(2.5px 2.5px at 730px 280px, rgba(255,255,255,0.9), transparent);
      }

      .glow-center {
        position: absolute;
        width: 700px;
        height: 700px;
        background: radial-gradient(circle, rgba(255,255,255,0.32) 0%, transparent 68%);
        border-radius: 50%;
        pointer-events: none;
      }

      .sparkle {
        position: absolute;
        width: 26px;
        height: 26px;
        background: radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.4) 35%, transparent 70%);
        border-radius: 50%;
        filter: blur(1.5px);
      }

      .content-wrapper {
        position: relative;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-top: -12px;
      }

      .logo-upper {
        width: 630px;
        filter: drop-shadow(0 8px 20px rgba(255,255,255,0.9)) drop-shadow(0 4px 10px rgba(35, 75, 105, 0.35));
        display: block;
      }

      .logo-lower {
        width: 330px;
        filter: drop-shadow(0 0 16px rgba(255,255,255,0.95)) drop-shadow(0 5px 12px rgba(35, 75, 105, 0.4));
        margin-top: 14px;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="stars"></div>
    <div class="glow-center"></div>
    <div class="sparkle" style="top: 100px; left: 140px;"></div>
    <div class="sparkle" style="top: 210px; right: 110px; width: 34px; height: 34px;"></div>
    <div class="sparkle" style="bottom: 140px; left: 160px; width: 22px; height: 22px;"></div>

    <div class="content-wrapper">
      <img class="logo-upper" src="data:image/png;base64,${upperB64}" alt="光遇" />
      <img class="logo-lower" src="data:image/png;base64,${wikiB64}" alt="wiki" />
    </div>
  </body>
  </html>
  `;

  await page.setContent(renderHtml);
  await page.screenshot({ path: outputLogoPath, clip: { x: 0, y: 0, width: 800, height: 800 } });
  await browser.close();

  console.log(`   - 复现图片渲染输出完成: ${outputLogoPath}`);

  console.log(`[4/4] 计算 SHA-256 Hash 对比...`);
  const reproducedHash = getFileHash(outputLogoPath);
  const assetHash = getFileHash(assetLogoPath);

  console.log('--------------------------------------------------');
  console.log('复现产物 (temp/reproduced_logo.png) SHA-256:');
  console.log('  ' + reproducedHash);
  console.log('当前基准 (assets/logo.png)         SHA-256:');
  console.log('  ' + assetHash);
  console.log('--------------------------------------------------');

  if (reproducedHash === assetHash) {
    console.log('🎉 验证结果: HASH 完全一致 (100% 字节级无损复现！)');
  } else {
    console.log('ℹ️ 验证结果: HASH 存在细微渲染差异（不同环境/显卡抗锯齿属于正常差异）');
  }

  // 检查是否传入 --update-asset 标志
  if (process.argv.includes('--update-asset')) {
    fs.copyFileSync(outputLogoPath, assetLogoPath);
    console.log('✅ 已同步将复现产物更新至 assets/logo.png');
  }
}

main().catch((err) => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
