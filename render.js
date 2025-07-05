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

async function renderResolution({ width, height, label, mode, frameNumber, imageFormat }) {
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

    console.log('Waiting for renderer initialization...');
    await page.waitForFunction(() => typeof window.renderFrame === 'function', { timeout: 60000 });
    await delay(1000);

    if (mode === 'still frame') {
        console.log(`Rendering frame ${frameNumber} for ${label}...`);
        const base64 = await page.evaluate((index) => {
            const result = window.renderFrame(index);
            if (!result) throw new Error('renderFrame returned null or undefined');
            return result;
        }, frameNumber);

        const outputPath = path.join(outputDir, `frame_${frameNumber}.${imageFormat}`);
        const data = base64.replace(/^data:image\/\w+;base64,/, '');
        await fs.writeFile(outputPath, data, 'base64');
        console.log(`â Saved still frame: ${outputPath}`);
        await browser.close();
        return;
    }

    console.log(`Starting frame rendering for ${label}...`);
    for (let i = 0; i < FRAME_COUNT; i++) {
        const base64 = await page.evaluate((index) => {
            const result = window.renderFrame(index);
            if (!result) throw new Error('renderFrame returned null or undefined');
            return result;
        }, i);

        const filename = path.join(framesDir, `frame_${String(i).padStart(3, '0')}.png`);
        await fs.writeFile(filename, base64.replace(/^data:image\/png;base64,/, ''), 'base64');
        console.log(`Rendered frame ${i + 1}/${FRAME_COUNT} (${label})`);
    }

    await browser.close();

    const outputFile = path.join(outputDir, `shader-loop.webm`);
    const ffmpegCmd = `ffmpeg -framerate ${FPS} -i frames/frame_%03d.png -c:v libvpx-vp9 -b:v 12M -pix_fmt yuv420p "${outputFile}"`;

    console.log(`\nðï¸  Running ffmpeg for ${label}...`);
    const { execSync } = await import('child_process');
    execSync(ffmpegCmd, { stdio: 'inherit' });

    console.log(`â Done: ${outputFile}\n`);
}

async function main() {
    const { exportType } = await inquirer.prompt([
        {
            name: 'exportType',
            type: 'list',
            message: 'What do you want to export?',
            choices: ['Video', 'Still Frame'],
        },
    ]);

    const { selectedPresets } = await inquirer.prompt([
        {
            name: 'selectedPresets',
            type: 'checkbox',
            message: 'Select resolutions:',
            choices: PRESETS.map((p) => ({ name: p.name, value: p })),
            validate: (a) => (a.length ? true : 'Pick at least one'),
        },
    ]);

    let frameNumber = 0;
    let imageFormat = 'png';

    if (exportType === 'Still Frame') {
        const { frameInput } = await inquirer.prompt([
            {
                name: 'frameInput',
                type: 'input',
                message: `Enter frame number (0-${FRAME_COUNT - 1}):`,
                validate: (val) => {
                    const num = parseInt(val, 10);
                    return isNaN(num) || num < 0 || num >= FRAME_COUNT
                        ? `Must be between 0 and ${FRAME_COUNT - 1}`
                        : true;
                },
            },
        ]);
        frameNumber = parseInt(frameInput, 10);

        const { formatChoice } = await inquirer.prompt([
            {
                name: 'formatChoice',
                type: 'list',
                message: 'Select image format:',
                choices: ['png', 'jpeg', 'webp'],
            },
        ]);
        imageFormat = formatChoice;
    }

    for (const preset of selectedPresets) {
        await renderResolution({
            ...preset,
            label: preset.name,
            mode: exportType.toLowerCase(),
            frameNumber,
            imageFormat,
        });
    }

    console.log('ð All exports complete.');
}

main().catch(console.error);
