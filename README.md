# shader-renderer

## Overview
This is a simple renderer that creates videos from shaders (#SaveTheGPUs) using three.js, puppeteer, and ffmpeg. It is not and likely will not be made into an installable package or executable. Never say never though. You probably shouldn't even be reading this if your name is not Noah, but if you are:

## Environment setup
Make sure you have and a modern node version `ffmpeg` installed globally. 

For macOS, install it is recommended that you install `ffmpeg` using `homebrew`:
```bash
brew install ffmpeg
```

## Usage
This is meant to generate 10-second videos @ 30fps. Keep that in mind when designing shaders

1. Define a `*.glsl` shader like `shaders/arvora-frag.glsl`
2. Replace the path for `fragmentShader` on line 46 in `index.html` with the path to your shader
3. Run `node render.js`
4. Select your output formats. Multiple selections supported (Options include QHD, Full HD, ultrawide 21:9, vertical mobile [1080x1920], and tablet/mobile [900x1600])
5. Wait for the frames and video to generate (maybe get up and stretch or something idk)