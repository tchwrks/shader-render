import puppeteer from 'puppeteer';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';

const PRESETS = [
    { name: '2560x1440 (QHD)', width: 2560, height: 1440 },
    { name: '1920x1080 (Full HD)', width: 1920, height: 1080 },
    { name: '3440x1440 (Ultrawide 21:9)', width: 3440, height: 1440 },
    { name: '1080x1920 (Vertical Mobile)', width: 1080, height: 1920 },
    { name: '900x1600 (Tablet/Mobile)', width: 900, height: 1600 },
];

const FRAME_COUNT = 300;
const FPS = 30;
const HTML_PATH = 'file://' + path.resolve('./index.html');

const ensureDir = async (dir) => fs.mkdir(dir, { recursive: true });
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function renderResolution({ width, height, label }) {
    const framesDir = path.resolve('./frames');
    const outputDir = path.resolve(`./output/${width}x${height}`);
    await ensureDir(framesDir);
    await ensureDir(outputDir);

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-web-security',
            '--allow-file-access-from-files',
            '--enable-webgl',
            '--use-gl=angle',
            '--use-angle=gl',
            '--enable-accelerated-2d-canvas',
            '--disable-gpu-sandbox',
            '--ignore-gpu-blacklist',
            '--enable-gpu-rasterization',
            '--enable-oop-rasterization',
            '--disable-features=VizDisplayCompositor'
        ],
    });

    const page = await browser.newPage();

    // ! for debugging
    page.on('console', (msg) => {
        console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
        console.error(`[Page Error] ${error.message}`);
    });

    await page.evaluateOnNewDocument((w, h) => {
        window.__renderConfig = { width: w, height: h };
    }, width, height);

    console.log(`Loading page: ${HTML_PATH}`);
    await page.goto(HTML_PATH);

    // Wait for renderer to initialize (increased timeout for async loading)
    console.log('Waiting for renderer initialization...');
    await page.waitForFunction(() => typeof window.renderFrame === 'function', { timeout: 60000 });

    // Additional delay to ensure everything is fully loaded
    await delay(1000);

    console.log(`Starting frame rendering for ${label}...`);

    for (let i = 0; i < FRAME_COUNT; i++) {
        try {
            const base64 = await page.evaluate((index) => {
                const result = window.renderFrame(index);
                if (!result) {
                    throw new Error('renderFrame returned null or undefined');
                }
                return result;
            }, i);

            const filename = path.join(framesDir, `frame_${String(i).padStart(3, '0')}.png`);
            await fs.writeFile(filename, base64.replace(/^data:image\/png;base64,/, ''), 'base64');
            console.log(`Rendered frame ${i + 1}/${FRAME_COUNT} (${label})`);
        } catch (error) {
            console.error(`Error rendering frame ${i}:`, error);
            throw error;
        }
    }

    await browser.close();

    const outputFile = path.join(outputDir, `shader-loop.webm`);
    const ffmpegCmd = `ffmpeg -framerate ${FPS} -i frames/frame_%03d.png -c:v libvpx-vp9 -b:v 12M -pix_fmt yuv420p "${outputFile}"`;

    console.log(`\n🎞️  Running ffmpeg for ${label}...`);
    const { execSync } = await import('child_process');
    execSync(ffmpegCmd, { stdio: 'inherit' });

    console.log(`✅ Done: ${outputFile}\n`);
}

async function main() {
    const { selectedPresets } = await inquirer.prompt([
        {
            name: 'selectedPresets',
            type: 'checkbox',
            message: 'Select resolutions to render:',
            choices: PRESETS.map((p) => ({ name: p.name, value: p })),
            validate: (a) => (a.length ? true : 'Pick at least one'),
        },
    ]);

    for (const preset of selectedPresets) {
        await renderResolution({ ...preset, label: preset.name });
    }

    console.log('🎉 All renders complete.');
}

main().catch(console.error);