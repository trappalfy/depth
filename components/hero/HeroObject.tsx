'use client'

import { useEffect, useRef } from 'react'

const VERT = `#version 300 es
in vec2 p;
out vec2 vUv;
void main() {
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`

// Pass 1 — raymarch the drop into a texture, premultiplied, with analytic
// coverage at the silhouette so the edge never stair-steps.
const SCENE = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform float uTime;
uniform int uSteps;

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

// Orbit radii stay LARGER than the sphere radii, so the lobes genuinely
// separate and re-merge instead of sitting inside one another. The whole
// field is squashed in y, which turns the ball into a wide pebble; the
// distance is divided by the squash so the metric stays conservative.
const float SQUASH = 1.34;

float map(vec3 p) {
  float t = uTime * 0.17;
  p.y -= sin(t * 0.45) * 0.10;              // slow breathing
  p.y *= SQUASH;

  vec3 c1 = vec3(sin(t * 0.90) * 0.72, cos(t * 0.70) * 0.34 + 0.05, sin(t * 0.50) * 0.26);
  vec3 c2 = vec3(cos(t * 1.10) * 0.84, sin(t * 0.80) * 0.44 - 0.14, cos(t * 0.60) * 0.24);
  vec3 c3 = vec3(sin(t * 0.60 + 2.1) * 0.90, cos(t * 1.30 + 1.0) * 0.38, sin(t * 0.90 + 0.5) * 0.28);
  vec3 c4 = vec3(cos(t * 0.75 + 4.0) * 0.66, sin(t * 1.05 + 2.5) * 0.50 + 0.12, cos(t * 0.80 + 1.7) * 0.22);

  float d = length(p - c1) - 0.70;
  d = smin(d, length(p - c2) - 0.62, 0.62);
  d = smin(d, length(p - c3) - 0.54, 0.62);
  d = smin(d, length(p - c4) - 0.58, 0.62);
  d += (noise(p * 1.6 + t * 0.5) - 0.5) * 0.11;
  return d / SQUASH;
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

// The object's entire palette lives here. Not a gradient — banded, the way a
// polished metal reads an environment: dark crown, a broad gold sweep biased
// left, dark again, a cobalt pool low and centre-left, near-black at the base.
vec3 env(vec3 r) {
  vec3 gold   = vec3(0.808, 0.576, 0.200);
  vec3 goldHi = vec3(0.960, 0.790, 0.430);
  vec3 cobalt = vec3(0.102, 0.259, 0.471);
  vec3 cobaltHi = vec3(0.165, 0.372, 0.659);

  float up   = r.y * 0.5 + 0.5;   // 0 at the base, 1 at the crown
  float side = r.x * 0.5 + 0.5;   // 0 left, 1 right

  vec3 c = vec3(0.018, 0.018, 0.022);

  // Cobalt pool, low and pulled to the left of centre.
  float blue = smoothstep(0.52, 0.10, up) * (1.0 - smoothstep(0.30, 0.86, side));
  c = mix(c, cobalt, blue * 0.95);
  c += cobaltHi * pow(blue, 3.0) * 0.55;

  // Gold sweep: a band, not a ramp, and much stronger on the left.
  float band = smoothstep(0.40, 0.58, up) * (1.0 - smoothstep(0.76, 0.94, up));
  float lean = mix(1.0, 0.30, smoothstep(0.25, 0.85, side));
  c = mix(c, gold, band * lean);
  c += goldHi * pow(band, 2.2) * lean * 0.85;

  // Dark crown, so the top reads as shadow rather than more gold.
  c = mix(c, vec3(0.020, 0.020, 0.024), smoothstep(0.86, 1.0, up));

  // The single white specular, tight, to the lower right.
  vec3 lightDir = normalize(vec3(0.58, -0.52, 0.63));
  c += vec3(1.0) * pow(max(dot(r, lightDir), 0.0), 150.0) * 4.5;

  return c;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.0, 2.15);
  vec3 rd = normalize(vec3(uv, -1.80));

  float t = 0.0;
  float minD = 1e9;
  float minT = 0.0;
  bool hit = false;

  for (int i = 0; i < 96; i++) {
    if (i >= uSteps) break;
    float d = map(ro + rd * t);
    if (d < minD) { minD = d; minT = t; }
    if (d < 0.0012) { hit = true; break; }
    t += d * 0.85;
    if (t > 6.5) break;
  }

  // Analytic coverage: how close the closest approach came, measured in
  // pixels at that depth. This is the antialiasing.
  float pw = max(minT, 0.001) * 2.0 / (uRes.y * 1.80);
  float cov = hit ? 1.0 : 1.0 - smoothstep(0.0, pw * 2.0, minD);
  if (cov <= 0.001) { outColor = vec4(0.0); return; }

  float ht = hit ? t : minT;
  vec3 p = ro + rd * ht;
  vec3 n = normalAt(p);
  vec3 r = reflect(rd, n);

  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

  // Iridescent film: one environment sample per channel, offset along fresnel.
  float sh = 0.045 * fres;
  vec3 col = vec3(
    env(normalize(r + vec3(sh, 0.0, 0.0))).r,
    env(r).g,
    env(normalize(r - vec3(sh, 0.0, 0.0))).b);

  // Polished metal: the environment IS the colour. No diffuse term lifting the
  // shadows, which is what kept the darks grey and made it read as plastic.
  col *= 0.88 + 0.42 * fres;

  // Rim light: a thin bright arc along the lower-right edge, separate from the
  // specular. This is the crisp line the reference carries around its base.
  vec2 nxy = length(n.xy) > 0.0001 ? normalize(n.xy) : vec2(0.0, -1.0);
  float rimDir = clamp(dot(nxy, normalize(vec2(0.60, -0.80))), 0.0, 1.0);
  col += vec3(1.0) * pow(fres, 3.5) * pow(rimDir, 2.0) * 2.2;

  outColor = vec4(col * cov, cov);   // premultiplied
}`

// Pass 2 — separable gaussian. Run twice, horizontal then vertical.
const BLUR = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uDir;      // texel-sized step, one axis at a time

void main() {
  float w[5];
  w[0] = 0.2270270270; w[1] = 0.1945945946; w[2] = 0.1216216216;
  w[3] = 0.0540540541; w[4] = 0.0162162162;
  vec4 sum = texture(uTex, vUv) * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 o = uDir * float(i) * 1.4;
    sum += texture(uTex, vUv + o) * w[i];
    sum += texture(uTex, vUv - o) * w[i];
  }
  outColor = sum;
}`

// Pass 3 — composite. The body comes from the blurred buffer; the silhouette
// arc, found where coverage changes fastest, comes back sharp. Bloom is the
// blurred buffer's bright end added on top.
const COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uSharp;
uniform sampler2D uBlur;
uniform vec2 uTexel;

void main() {
  vec4 sharp = texture(uSharp, vUv);
  vec4 blur  = texture(uBlur, vUv);

  // Coverage gradient marks the rim arc.
  float ax = texture(uSharp, vUv + vec2(uTexel.x, 0.0)).a
           - texture(uSharp, vUv - vec2(uTexel.x, 0.0)).a;
  float ay = texture(uSharp, vUv + vec2(0.0, uTexel.y)).a
           - texture(uSharp, vUv - vec2(0.0, uTexel.y)).a;
  float rim = smoothstep(0.02, 0.55, length(vec2(ax, ay)));

  vec4 c = mix(blur, sharp, rim);

  float lum = dot(blur.rgb, vec3(0.2126, 0.7152, 0.0722));
  c.rgb += blur.rgb * smoothstep(0.70, 1.0, lum) * 0.55;

  outColor = c;
}`

/** The hero's own framing. Passing nothing reproduces it exactly. */
const HERO_CLASS =
  'pointer-events-none absolute left-1/2 h-[76%] w-[86%] -translate-x-1/2 max-md:w-[124%]'
const HERO_STYLE: React.CSSProperties = { top: '46%' }

export function HeroObject({
  className = HERO_CLASS,
  style = HERO_STYLE,
}: {
  className?: string
  style?: React.CSSProperties
} = {}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    })
    if (!gl) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 767px)').matches

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s))
        return null
      }
      return s
    }

    const link = (fragSrc: string) => {
      const v = compile(gl.VERTEX_SHADER, VERT)
      const f = compile(gl.FRAGMENT_SHADER, fragSrc)
      const prog = gl.createProgram()
      if (!v || !f || !prog) return null
      gl.attachShader(prog, v)
      gl.attachShader(prog, f)
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(prog))
        return null
      }
      return prog
    }

    const progScene = link(SCENE)
    const progBlur = link(BLUR)
    const progComposite = link(COMPOSITE)
    if (!progScene || !progBlur || !progComposite) return

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    for (const prog of [progScene, progBlur, progComposite]) {
      const loc = gl.getAttribLocation(prog, 'p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    }

    const makeTarget = () => {
      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      return { tex, fbo }
    }

    const sceneTarget = makeTarget()
    const pingTarget = makeTarget()
    const pongTarget = makeTarget()
    const targets = [sceneTarget, pingTarget, pongTarget]

    let w = 1
    let h = 1

    const scale = mobile ? 0.5 : 0.75
    const dprCap = mobile ? 1.25 : 1.5

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      w = Math.max(1, Math.floor(canvas.offsetWidth * dpr * scale))
      h = Math.max(1, Math.floor(canvas.offsetHeight * dpr * scale))
      canvas.width = w
      canvas.height = h
      for (const t of targets) {
        gl.bindTexture(gl.TEXTURE_2D, t.tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      }
    }

    const uSceneRes = gl.getUniformLocation(progScene, 'uRes')
    const uSceneTime = gl.getUniformLocation(progScene, 'uTime')
    const uSceneSteps = gl.getUniformLocation(progScene, 'uSteps')
    const uBlurTex = gl.getUniformLocation(progBlur, 'uTex')
    const uBlurDir = gl.getUniformLocation(progBlur, 'uDir')
    const uCompSharp = gl.getUniformLocation(progComposite, 'uSharp')
    const uCompBlur = gl.getUniformLocation(progComposite, 'uBlur')
    const uCompTexel = gl.getUniformLocation(progComposite, 'uTexel')

    let raf = 0
    let visible = true
    const start = performance.now()

    const frame = (now: number) => {
      gl.viewport(0, 0, w, h)
      gl.disable(gl.BLEND)

      // 1. scene
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.fbo)
      gl.useProgram(progScene)
      gl.uniform2f(uSceneRes, w, h)
      gl.uniform1f(uSceneTime, reduced ? 11.0 : (now - start) / 1000)
      gl.uniform1i(uSceneSteps, mobile ? 44 : 72)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // 2. blur, horizontal then vertical
      gl.useProgram(progBlur)
      gl.uniform1i(uBlurTex, 0)
      gl.activeTexture(gl.TEXTURE0)

      gl.bindFramebuffer(gl.FRAMEBUFFER, pingTarget.fbo)
      gl.bindTexture(gl.TEXTURE_2D, sceneTarget.tex)
      gl.uniform2f(uBlurDir, 3.0 / w, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      gl.bindFramebuffer(gl.FRAMEBUFFER, pongTarget.fbo)
      gl.bindTexture(gl.TEXTURE_2D, pingTarget.tex)
      gl.uniform2f(uBlurDir, 0, 3.0 / h)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // 3. composite to screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.useProgram(progComposite)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, sceneTarget.tex)
      gl.uniform1i(uCompSharp, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, pongTarget.tex)
      gl.uniform1i(uCompBlur, 1)
      gl.uniform2f(uCompTexel, 1 / w, 1 / h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      if (!reduced && visible) raf = requestAnimationFrame(frame)
    }

    resize()
    frame(start)
    window.addEventListener('resize', resize)

    // Raymarching a scene nobody is looking at costs the same as one they are.
    // The loop stops when the canvas leaves the viewport and picks up on return;
    // the object's phase keeps advancing, which is unobservable while hidden.
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nowVisible = entry.isIntersecting
        if (nowVisible === visible) return
        visible = nowVisible
        if (visible && !reduced) raf = requestAnimationFrame(frame)
        else cancelAnimationFrame(raf)
      },
      { threshold: 0 },
    )
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={style}
    />
  )
}
