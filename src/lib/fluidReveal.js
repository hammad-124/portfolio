import * as THREE from 'three'

/**
 * FluidReveal
 * -----------
 * A GPU fluid simulation (Navier-Stokes) driven by the mouse. The simulated
 * "dye" is used as a mask that dissolves a painted surface (baked into a
 * texture by the `bake` callback) so whatever sits behind the canvas shows
 * through, like water washing paint off glass.
 *
 * Besides the mouse, two programmatic controls exist:
 *   setWash(p)  — 0..1 procedural flood from the top edge (scroll-driven)
 *   splat(...)  — inject a splat at a normalized point (turbulence, etc.)
 *
 * Pipeline per frame:
 *   splats (mouse + queue) -> curl -> vorticity -> advect velocity -> advect dye
 *   -> divergence -> pressure (Jacobi) -> gradient subtract -> composite
 */

export const DEFAULT_SETTINGS = {
  simResolution: 256,
  dyeResolution: 512,
  velocityDissipation: 0.962,
  dyeDissipation: 0.988,
  pressureIterations: 20,
  curlStrength: 0,
  splatRadius: 0.00006,
  splatForce: 5900,
  revealSize: 3.9,
  edgeSoftness: 0.5,
  edgeWidth: 0.01,
  maxPixelRatio: 2,
  // The sim domain is `overscan` x taller than the visible area (the reference
  // site runs it over a 300vh wrapper and shows the middle third). This keeps
  // splats wide and vertical mouse motion gentle instead of thin fast streaks.
  overscan: 3,
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const ADVECTION = /* glsl */ `
  precision highp float;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 uTexelSize;
  uniform float uDt;
  uniform float uDissipation;
  varying vec2 vUv;

  vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
  }

  void main() {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
    gl_FragColor = uDissipation * bilerp(uSource, coord, uTexelSize);
  }
`

const SPLAT = /* glsl */ `
  precision highp float;
  uniform sampler2D uTarget;
  uniform float uAspectRatio;
  uniform vec2 uPoint;
  uniform vec3 uColor;
  uniform float uRadius;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspectRatio;
    vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`

const CURL = /* glsl */ `
  precision highp float;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
    float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`

const VORTICITY = /* glsl */ `
  precision highp float;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform vec2 uTexelSize;
  uniform float uCurlStrength;
  uniform float uDt;
  varying vec2 vUv;

  void main() {
    float L = texture2D(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
    float T = texture2D(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
    float B = texture2D(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
    float C = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    float len = length(force) + 0.0001;
    force = force / len * uCurlStrength * C;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * uDt;
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`

const DIVERGENCE = /* glsl */ `
  precision highp float;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`

const PRESSURE = /* glsl */ `
  precision highp float;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`

const GRADIENT_SUBTRACT = /* glsl */ `
  precision highp float;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity -= vec2(R - L, T - B) * 0.5;
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`

// Final composite: the baked surface fades to transparent wherever there is
// dye, or wherever the scroll-driven wash has flooded past (an organic front
// pouring from the top edge, shaped by value noise so it never looks like a wipe).
const MASK = /* glsl */ `
  precision highp float;
  uniform sampler2D uBase;
  uniform sampler2D uDye;
  uniform float uRevealSize;
  uniform float uEdgeSoftness;
  uniform float uEdgeWidth;
  uniform float uDyeScale;   // 1 / overscan
  uniform float uDyeOffset;  // (overscan - 1) / 2 / overscan
  uniform float uWash;       // 0..1 flood progress
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    float dye = texture2D(uDye, vec2(vUv.x, uDyeOffset + vUv.y * uDyeScale)).r;
    vec4 base = texture2D(uBase, vUv);
    float raw = dye * uRevealSize;
    float mask = clamp(smoothstep(uEdgeSoftness, uEdgeSoftness + uEdgeWidth, raw), 0.0, 1.0);

    if (uWash > 0.0) {
      float y = 1.0 - vUv.y;                       // 0 at the top edge, 1 at the bottom
      vec2 q = vec2(vUv.x * uAspect * 2.2, vUv.y * 2.2);
      float n = noise(q + uTime * 0.06) * 0.7 + noise(q * 2.7 - uTime * 0.04) * 0.3;
      float front = uWash * 1.35 - y - (n - 0.5) * 0.4;
      float wash = smoothstep(0.0, 0.08, front);
      mask = max(mask, wash);
    }

    gl_FragColor = vec4(base.rgb, base.a * (1.0 - mask));
  }
`

export class FluidReveal {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container  element whose size the effect covers
   * @param {HTMLCanvasElement} opts.canvas  canvas to render into (absolutely positioned over container)
   * @param {(ctx: CanvasRenderingContext2D, width: number, height: number) => void} opts.bake
   *        draws the surface that will be washed away (in CSS pixels)
   * @param {() => void} [opts.onFirstFrame]
   * @param {Partial<typeof DEFAULT_SETTINGS>} [opts.settings]
   */
  constructor({ container, canvas, bake, onFirstFrame, settings = {} }) {
    this.container = container
    this.canvas = canvas
    this.bake = bake
    this.onFirstFrame = onFirstFrame
    this.settings = { ...DEFAULT_SETTINGS, ...settings }
    this.disposed = false

    this.mouse = { x: 0.5, y: 0.5 }
    this.prevMouse = { x: 0.5, y: 0.5 }
    this.mouseHasMoved = false
    this.size = { width: 1, height: 1 }
    this.queue = [] // programmatic splats
    this.wash = 0
    this.time = 0

    this._buildRenderer()
    this._buildSim()
    this._buildComposite()
    this._bindEvents()
    this._resize()

    this._animate = this._animate.bind(this)
    this._rafId = requestAnimationFrame(this._animate)
  }

  /* ---------- public controls ---------- */

  /** Wipe all dye and velocity, so the surface is intact again. */
  reset() {
    const clear = (t) => { this.renderer.setRenderTarget(t); this.renderer.clear() }
    clear(this.dye.read); clear(this.dye.write)
    clear(this.velocity.read); clear(this.velocity.write)
    clear(this.pressure.read); clear(this.pressure.write)
    this.renderer.setRenderTarget(null)
    this.queue.length = 0
    this.mouseHasMoved = false
  }

  /** 0..1 — how far the scroll-driven flood has poured down the surface. */
  setWash(p) {
    this.wash = Math.min(1, Math.max(0, p))
  }

  /**
   * Inject a splat. x, y are normalized to the visible canvas (0..1, y from the
   * top); dx, dy are a direction in the same units; strength scales the dye.
   */
  splat(x, y, dx = 0, dy = 0, strength = 1) {
    this.queue.push({ x, y, dx, dy, strength })
  }

  /* ---------- setup ---------- */

  _buildRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.settings.maxPixelRatio))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.autoClear = false

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
    this.scene.add(this.quad)
  }

  _createRT(w, h, filter) {
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: filter,
      magFilter: filter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    })
  }

  _createDoubleFBO(w, h, filter) {
    return {
      read: this._createRT(w, h, filter),
      write: this._createRT(w, h, filter),
      swap() {
        const t = this.read
        this.read = this.write
        this.write = t
      },
      dispose() {
        this.read.dispose()
        this.write.dispose()
      },
    }
  }

  _pass(frag, uniforms) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: frag,
      uniforms,
      depthTest: false,
      depthWrite: false,
    })
  }

  _buildSim() {
    const s = this.settings
    const sim = s.simResolution
    const dye = s.dyeResolution

    this.velocity = this._createDoubleFBO(sim, sim, THREE.LinearFilter)
    this.pressure = this._createDoubleFBO(sim, sim, THREE.NearestFilter)
    this.dye = this._createDoubleFBO(dye, dye, THREE.LinearFilter)
    this.curlRT = this._createRT(sim, sim, THREE.NearestFilter)
    this.divergenceRT = this._createRT(sim, sim, THREE.NearestFilter)

    this.simTexel = new THREE.Vector2(1 / sim, 1 / sim)
    this.dyeTexel = new THREE.Vector2(1 / dye, 1 / dye)

    this.curlMat = this._pass(CURL, {
      uVelocity: { value: null },
      uTexelSize: { value: this.simTexel },
    })
    this.vorticityMat = this._pass(VORTICITY, {
      uVelocity: { value: null },
      uCurl: { value: null },
      uTexelSize: { value: this.simTexel },
      uCurlStrength: { value: s.curlStrength },
      uDt: { value: 0.016 },
    })
    this.advectionMat = this._pass(ADVECTION, {
      uVelocity: { value: null },
      uSource: { value: null },
      uTexelSize: { value: this.simTexel },
      uDt: { value: 1 },
      uDissipation: { value: s.velocityDissipation },
    })
    this.splatMat = this._pass(SPLAT, {
      uTarget: { value: null },
      uAspectRatio: { value: 1 },
      uPoint: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Vector3() },
      uRadius: { value: s.splatRadius },
    })
    this.divergenceMat = this._pass(DIVERGENCE, {
      uVelocity: { value: null },
      uTexelSize: { value: this.simTexel },
    })
    this.pressureMat = this._pass(PRESSURE, {
      uPressure: { value: null },
      uDivergence: { value: null },
      uTexelSize: { value: this.simTexel },
    })
    this.gradientMat = this._pass(GRADIENT_SUBTRACT, {
      uPressure: { value: null },
      uVelocity: { value: null },
      uTexelSize: { value: this.simTexel },
    })
  }

  _buildComposite() {
    const s = this.settings
    this.bakeCanvas = document.createElement('canvas')
    this.baseTexture = new THREE.CanvasTexture(this.bakeCanvas)
    this.baseTexture.minFilter = THREE.LinearFilter
    this.baseTexture.magFilter = THREE.LinearFilter
    this.baseTexture.generateMipmaps = false

    this.maskMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: MASK,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uBase: { value: this.baseTexture },
        uDye: { value: null },
        uRevealSize: { value: s.revealSize },
        uEdgeSoftness: { value: s.edgeSoftness },
        uEdgeWidth: { value: s.edgeWidth },
        uDyeScale: { value: 1 / s.overscan },
        uDyeOffset: { value: (s.overscan - 1) / 2 / s.overscan },
        uWash: { value: 0 },
        uTime: { value: 0 },
        uAspect: { value: 1 },
      },
    })
  }

  _bindEvents() {
    this._onMouseMove = (e) => this._setPointer(e.clientX, e.clientY)
    this._onTouchMove = (e) => {
      if (!e.touches.length) return
      this._setPointer(e.touches[0].clientX, e.touches[0].clientY)
    }
    this._onResize = () => this._resize()

    window.addEventListener('mousemove', this._onMouseMove, { passive: true })
    window.addEventListener('touchmove', this._onTouchMove, { passive: true })
    window.addEventListener('resize', this._onResize)

    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._resize())
      this._ro.observe(this.container)
    }
  }

  // Map a point in visible-canvas space (0..1, y from top) into the taller
  // virtual sim domain (0..1, y from bottom).
  _toSim(nx, ny) {
    const o = this.settings.overscan
    const pad = (o - 1) / 2
    return { x: nx, y: (pad + (1 - ny)) / o }
  }

  _setPointer(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect()
    // Ignore the pointer while the canvas is off screen (it still receives window events).
    if (r.bottom <= 0 || r.top >= window.innerHeight) return
    const p = this._toSim((clientX - r.left) / r.width, (clientY - r.top) / r.height)
    this.mouse.x = p.x
    this.mouse.y = p.y
    this.mouseHasMoved = true
  }

  /* ---------- sizing / baking ---------- */

  _resize() {
    const r = this.container.getBoundingClientRect()
    const w = Math.max(1, Math.round(r.width))
    const h = Math.max(1, Math.round(r.height))
    if (w === this.size.width && h === this.size.height && this._baked) return
    this.size = { width: w, height: h }
    this.renderer.setSize(w, h, false)
    this.maskMat.uniforms.uAspect.value = w / h
    this.rebake()
  }

  /** Re-draw the surface texture. Call after fonts load or content changes. */
  rebake() {
    if (this.disposed) return
    const { width, height } = this.size
    const dpr = Math.min(window.devicePixelRatio || 1, this.settings.maxPixelRatio)
    this.bakeCanvas.width = Math.round(width * dpr)
    this.bakeCanvas.height = Math.round(height * dpr)
    const ctx = this.bakeCanvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    this.bake?.(ctx, width, height)
    this.baseTexture.needsUpdate = true
    this._baked = true
  }

  /* ---------- per-frame ---------- */

  _renderPass(material, target) {
    this.quad.material = material
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, this.camera)
  }

  _animate() {
    if (this.disposed) return
    this._rafId = requestAnimationFrame(this._animate)
    // Skip the whole sim while the canvas is scrolled out of view.
    const r = this.canvas.getBoundingClientRect()
    if (r.bottom <= 0 || r.top >= window.innerHeight) return
    this._step()
  }

  _splat(x, y, dx, dy, strength, aspect) {
    const s = this.settings
    const u = this.splatMat.uniforms
    u.uAspectRatio.value = aspect
    u.uPoint.value.set(x, y)
    u.uRadius.value = s.splatRadius

    u.uTarget.value = this.velocity.read.texture
    u.uColor.value.set(dx * s.splatForce * strength, dy * s.splatForce * strength, 0)
    this._renderPass(this.splatMat, this.velocity.write)
    this.velocity.swap()

    u.uTarget.value = this.dye.read.texture
    u.uColor.value.set(strength, strength, strength)
    this._renderPass(this.splatMat, this.dye.write)
    this.dye.swap()
  }

  _step() {
    const s = this.settings
    const aspect = this.size.width / (this.size.height * s.overscan)
    const strength = 0.89 // the reference's rest strength (1 - (1/3)^2)
    this.time += 1 / 60

    // 1a. mouse splat
    if (this.mouseHasMoved) {
      const dx = this.mouse.x - this.prevMouse.x
      const dy = this.mouse.y - this.prevMouse.y
      if (Math.hypot(dx, dy) > 0) this._splat(this.mouse.x, this.mouse.y, dx, dy, strength, aspect)
      this.prevMouse.x = this.mouse.x
      this.prevMouse.y = this.mouse.y
    }
    // 1b. queued splats
    if (this.queue.length) {
      const o = s.overscan
      for (const q of this.queue.splice(0, 8)) {
        const p = this._toSim(q.x, q.y)
        this._splat(p.x, p.y, q.dx, -q.dy / o, q.strength, aspect)
      }
    }

    // 2. curl + vorticity confinement
    this.curlMat.uniforms.uVelocity.value = this.velocity.read.texture
    this._renderPass(this.curlMat, this.curlRT)

    this.vorticityMat.uniforms.uVelocity.value = this.velocity.read.texture
    this.vorticityMat.uniforms.uCurl.value = this.curlRT.texture
    this.vorticityMat.uniforms.uCurlStrength.value = s.curlStrength
    this._renderPass(this.vorticityMat, this.velocity.write)
    this.velocity.swap()

    // 3. advect velocity
    const adv = this.advectionMat.uniforms
    adv.uVelocity.value = this.velocity.read.texture
    adv.uSource.value = this.velocity.read.texture
    adv.uTexelSize.value = this.simTexel
    adv.uDissipation.value = s.velocityDissipation
    this._renderPass(this.advectionMat, this.velocity.write)
    this.velocity.swap()

    // 4. advect dye
    adv.uVelocity.value = this.velocity.read.texture
    adv.uSource.value = this.dye.read.texture
    adv.uTexelSize.value = this.dyeTexel
    adv.uDissipation.value = s.dyeDissipation
    this._renderPass(this.advectionMat, this.dye.write)
    this.dye.swap()

    // 5. divergence
    this.divergenceMat.uniforms.uVelocity.value = this.velocity.read.texture
    this._renderPass(this.divergenceMat, this.divergenceRT)

    // 6. pressure solve (Jacobi)
    this.renderer.setRenderTarget(this.pressure.read)
    this.renderer.clear()
    this.pressureMat.uniforms.uDivergence.value = this.divergenceRT.texture
    for (let i = 0; i < s.pressureIterations; i++) {
      this.pressureMat.uniforms.uPressure.value = this.pressure.read.texture
      this._renderPass(this.pressureMat, this.pressure.write)
      this.pressure.swap()
    }

    // 7. subtract pressure gradient
    this.gradientMat.uniforms.uPressure.value = this.pressure.read.texture
    this.gradientMat.uniforms.uVelocity.value = this.velocity.read.texture
    this._renderPass(this.gradientMat, this.velocity.write)
    this.velocity.swap()

    // 8. composite to screen
    const mu = this.maskMat.uniforms
    mu.uDye.value = this.dye.read.texture
    mu.uWash.value = this.wash
    mu.uTime.value = this.time
    this.quad.material = this.maskMat
    this.renderer.setRenderTarget(null)
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)

    // Let the host know the surface is on screen (used to unhide the backdrop
    // so it never flashes before the white surface is drawn).
    if (!this._firstFrameDone) {
      this._firstFrameDone = true
      this.onFirstFrame?.()
    }
  }

  /* ---------- teardown ---------- */

  destroy() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this._rafId)

    window.removeEventListener('mousemove', this._onMouseMove)
    window.removeEventListener('touchmove', this._onTouchMove)
    window.removeEventListener('resize', this._onResize)
    this._ro?.disconnect()

    this.velocity.dispose()
    this.pressure.dispose()
    this.dye.dispose()
    this.curlRT.dispose()
    this.divergenceRT.dispose()
    this.baseTexture.dispose()
    const mats = [
      this.curlMat, this.vorticityMat, this.advectionMat, this.splatMat,
      this.divergenceMat, this.pressureMat, this.gradientMat, this.maskMat,
    ]
    mats.forEach((m) => m.dispose())
    this.quad.geometry.dispose()
    this.renderer.dispose()
  }
}
