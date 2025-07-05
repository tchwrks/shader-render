precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

#define TAU 6.28318530718

// Hash to make noise coordinates more organic
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D value noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Looping time
float loopTime(float t, float duration) {
    return mod(t, duration);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 centered = uv * 2.0 - 1.0;
    centered.x *= u_resolution.x / u_resolution.y;

    float t = loopTime(u_time, 10.0);
    
    float speed = 0.05;
    float detail = 3.0;
    float movement = t * speed;

    // Layered noise
    float n = 0.0;
    for (int i = 0; i < 3; i++) {
        float scale = pow(2.0, float(i));
        n += noise(centered * scale + vec2(movement, movement)) / scale;
    }

    n = smoothstep(0.0, 1.0, n);

    // Animate flow direction in a loop
    float angle = TAU * (t / 10.0);
    vec2 flow = vec2(cos(angle), sin(angle)) * 0.25;

    // Offset UV with looping flow vector
    vec2 flowUv = centered + flow;
    float f = noise(flowUv * detail + movement * 0.5);

    // Color blending (purple → teal → blue)
    vec3 color = mix(vec3(0.2, 0.0, 0.4), vec3(0.0, 0.5, 0.8), f);
    color = mix(color, vec3(0.0, 0.3, 1.0), n * 0.5);

    // Soft glow edges
    float vignette = smoothstep(1.0, 0.3, length(centered));
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
}