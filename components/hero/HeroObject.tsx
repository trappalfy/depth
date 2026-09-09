'use client'

import { useEffect, useRef } from 'react'

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform float uTime;
uniform int uSteps;

// Polynomial smooth minimum — the drop is a union of spheres (brief §5.1).
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

float map(vec3 p) {
  float t = uTime * 0.055;                 // ~20 s cycle, no visible seam
  float d = length(p - vec3(sin(t) * 0.30, cos(t * 0.83) * 0.16, 0.0)) - 0.80;
  d = smin(d, length(p - vec3(cos(t * 1.17) * 0.42, sin(t * 0.91) * 0.24 + 0.18, 0.10)) - 0.62, 0.45);
  d = smin(d, length(p - vec3(sin(t * 0.73) * 0.38 - 0.20, cos(t * 1.31) * 0.20 - 0.22, -0.12)) - 0.55, 0.45);
  d = smin(d, length(p - vec3(cos(t * 0.61) * 0.26 + 0.30, sin(t * 1.07) * 0.18 - 0.05, 0.06)) - 0.48, 0.45);
  d += (noise(p * 2.1 + t) - 0.5) * 0.06;  // break the too-perfect silhouette
  return d;
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

// Procedural stand-in for the equirect environment: gold above, cobalt below,
// one hard white highlight to the lower right. THIS is the object's palette.
vec3 env(vec3 r) {
  vec3 gold   = vec3(0.808, 0.576, 0.200);  // #CE9333
  vec3 goldHi = vec3(0.906, 0.706, 0.361);  // #E7B45C
  vec3 cobalt = vec3(0.102, 0.259, 0.471);  // #1A4278
  vec3 deep   = vec3(0.035, 0.035, 0.040);

  float up = r.y * 0.5 + 0.5;
  vec3 c = mix(cobalt, gold, smoothstep(0.42, 0.86, up));
  c = mix(deep, c, smoothstep(0.05, 0.55, up));
  c += goldHi * pow(smoothstep(0.72, 1.0, up), 2.0) * 0.55;

  vec3 lightDir = normalize(vec3(0.62, -0.34, 0.70));
  float spec = pow(max(dot(r, lightDir), 0.0), 90.0);
  c += vec3(1.0) * spec * 2.4;              // the single white specular
  c += vec3(1.0) * pow(max(dot(r, lightDir), 0.0), 12.0) * 0.10;  // cheap bloom
  return c;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.0, 3.05);
  vec3 rd = normalize(vec3(uv, -1.7));

  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    if (i >= uSteps) break;
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.0016) { hit = true; break; }
    t += d * 0.85;
    if (t > 7.0) break;
  }

  if (!hit) { outColor = vec4(0.0); return; }

  vec3 p = ro + rd * t;
  vec3 n = normalAt(p);
  vec3 r = reflect(rd, n);

  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

  // Iridescent film: sample the environment at three slightly different
  // reflection vectors, one per channel (brief §5.1).
  float sh = 0.03 * fres;
  vec3 col = vec3(
    env(normalize(r + vec3(sh, 0.0, 0.0))).r,
    env(r).g,
    env(normalize(r - vec3(sh, 0.0, 0.0))).b);

  col = mix(col * 0.30, col, 0.55 + 0.45 * fres);

  // Only the rim arc stays sharp; alpha carries the body softly (brief §5).
  float rim = smoothstep(0.62, 1.0, fres);
  float alpha = clamp(0.72 + rim * 0.28, 0.0, 1.0);

  outColor = vec4(col, alpha);
}`

export function HeroObject() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    })
    if (!gl) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 767px)').matches

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, src)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader))
      }
      return shader
    }

    const vert = compile(gl.VERTEX_SHADER, VERT)
    const frag = compile(gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()
    if (!vert || !frag || !program) return

    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const uRes = gl.getUniformLocation(program, 'uRes')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uSteps = gl.getUniformLocation(program, 'uSteps')

    // Half resolution IS the defocus budget from brief §5.1; CSS scales it back
    // up. No CSS blur — that would soften the rim arc, which must stay sharp.
    const scale = mobile ? 0.25 : 0.5
    const dprCap = mobile ? 1.25 : 1.5

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      canvas.width = Math.max(1, Math.floor(canvas.offsetWidth * dpr * scale))
      canvas.height = Math.max(1, Math.floor(canvas.offsetHeight * dpr * scale))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    let raf = 0
    const start = performance.now()

    const frame = (now: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height)
      // Reduced motion freezes mid-morph rather than at a blank first frame.
      gl.uniform1f(uTime, reduced ? 11.0 : (now - start) / 1000)
      gl.uniform1i(uSteps, mobile ? 40 : 64)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduced) raf = requestAnimationFrame(frame)
    }

    resize()
    frame(start)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-1/2 h-[62%] w-[73%] -translate-x-1/2"
      style={{ top: '52%' }}
    />
  )
}
