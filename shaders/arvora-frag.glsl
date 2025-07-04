uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;
uniform vec4 u_background;
uniform float u_speed;
uniform float u_detail;

mat2 m(float a) {
float c = cos(a), s = sin(a);
return mat2(c, -s, s, c);
}

float getLoopedTime(float rawTime, float duration) {
return sin(rawTime / duration * 6.28318) * 0.5 + 0.5;
}

float map(vec3 p, float t) {
float offset = sin(p.x * 1.2 + t * 1.5) * 0.2 + cos(p.y * 1.5 - t * 1.2) * 0.1;
p.xz *= m(t * 0.4 + offset);
p.xy *= m(t * 0.1 - offset);
vec3 q = p * (1.8 + 0.2 * sin(t * 2.)) + t;
return length(p + vec3(sin(t * 0.1), cos(t * 0.2), sin(t * 0.3))) *
        log(length(p) + 0.9) +
        cos(q.x + sin(q.z + cos(q.y))) * 0.5 - 1.0;
}

void main() {
vec2 uv = gl_FragCoord.xy / u_resolution.xy;
vec2 a = uv - vec2(0.5);

vec3 cl = vec3(0.0);
float d = 2.5;

float t = getLoopedTime(u_time, 10.0) * u_speed;

vec2 swirl = sin(vec2(u_time * 0.1, u_time * 0.15)) * 0.05;
vec3 rayDir = normalize(vec3(a + swirl, -1.0));

for (float i = 0.; i <= (1. + 20. * u_detail); i++) {
    vec3 p = vec3(0.0, 0.0, 4.0) + rayDir * d;
    float rz = map(p, t);
    float f = clamp((rz - map(p + 0.1, t)) * 0.5, -0.1, 1.0);
    vec3 l = vec3(0.1, 0.3, 0.4) + vec3(5.0, 2.5, 3.0) * f;
    cl = cl * l + smoothstep(2.5, 0.0, rz) * 0.6 * l;
    d += min(rz, 1.0);
}

vec4 color = vec4(min(u_color, cl), 1.0);
color.rgb = max(color.rgb, u_background.rgb);
gl_FragColor = color;
}