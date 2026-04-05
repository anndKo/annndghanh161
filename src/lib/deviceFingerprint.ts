/**
 * Advanced Device Fingerprinting
 * Generates a unique device identifier using multiple browser signals.
 * Resistant to cookie clearing, incognito mode, and basic spoofing.
 */

// Canvas fingerprint
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('FP_canvas_test', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('FP_canvas_test', 4, 17);

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

// WebGL fingerprint
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl || !(gl instanceof WebGLRenderingContext)) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';

    return `${vendor}~${renderer}`;
  } catch {
    return 'webgl-error';
  }
}

// Audio fingerprint
function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        resolve('no-audio');
        return;
      }

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gain.gain.value = 0; // mute
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gain);
      gain.connect(context.destination);
      oscillator.start(0);

      const fingerprint: number[] = [];
      scriptProcessor.onaudioprocess = (event) => {
        const data = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(data);
        fingerprint.push(...Array.from(data.slice(0, 30)));

        oscillator.disconnect();
        scriptProcessor.disconnect();
        gain.disconnect();
        context.close();
        resolve(fingerprint.slice(0, 20).map(v => v.toFixed(2)).join(','));
      };

      setTimeout(() => {
        try {
          oscillator.disconnect();
          scriptProcessor.disconnect();
          context.close();
        } catch { /* ignore */ }
        resolve('audio-timeout');
      }, 1000);
    } catch {
      resolve('audio-error');
    }
  });
}

// Hardware & environment signals
function getHardwareSignals(): Record<string, string | number | boolean> {
  const nav = navigator as any;
  return {
    cores: nav.hardwareConcurrency || 0,
    memory: nav.deviceMemory || 0,
    maxTouchPoints: nav.maxTouchPoints || 0,
    screenWidth: screen.width,
    screenHeight: screen.height,
    screenDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navigator.languages?.join(',') || navigator.language,
    platform: nav.platform || 'unknown',
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: nav.doNotTrack || 'unknown',
  };
}

// Detect automation / bots
export function detectBot(): { isBot: boolean; signals: string[] } {
  const signals: string[] = [];
  const nav = navigator as any;

  // Check webdriver
  if (nav.webdriver) signals.push('webdriver');

  // Phantom / headless indicators
  if ((window as any).__nightmare) signals.push('nightmare');
  if ((window as any)._phantom || (window as any).__phantomas) signals.push('phantom');
  if ((window as any).callPhantom || (window as any)._selenium_unwrapped) signals.push('selenium');

  // Chrome headless
  if (/HeadlessChrome/.test(navigator.userAgent)) signals.push('headless-chrome');

  // Missing browser features
  if (!(window as any).chrome && /Chrome/.test(navigator.userAgent)) signals.push('fake-chrome');

  // Check for automation plugins
  if (nav.plugins && nav.plugins.length === 0 && !/Firefox/.test(navigator.userAgent)) {
    signals.push('no-plugins');
  }

  // Check permissions API inconsistency
  if (nav.permissions) {
    nav.permissions.query({ name: 'notifications' }).then((result: any) => {
      if (Notification.permission === 'denied' && result.state === 'prompt') {
        signals.push('permission-inconsistency');
      }
    }).catch(() => {});
  }

  // WebGL anomaly
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (/swiftshader|llvmpipe|mesa/i.test(renderer)) {
          signals.push('software-renderer');
        }
      }
    }
  } catch { /* ignore */ }

  return { isBot: signals.length >= 2, signals };
}

// SHA-256 hash
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get installed fonts (limited but helps)
function getFontFingerprint(): string {
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
    'Palatino', 'Garamond', 'Comic Sans MS', 'Impact', 'Lucida Console',
    'Tahoma', 'Trebuchet MS', 'Arial Black', 'Segoe UI',
  ];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'no-font-check';

  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';

  const getWidth = (font: string) => {
    ctx.font = `${testSize} ${font}`;
    return ctx.measureText(testString).width;
  };

  const baseWidths = baseFonts.map(f => getWidth(f));
  const detected: string[] = [];

  testFonts.forEach((font) => {
    baseFonts.forEach((base, i) => {
      const width = getWidth(`'${font}', ${base}`);
      if (width !== baseWidths[i]) {
        detected.push(font);
      }
    });
  });

  return [...new Set(detected)].join(',');
}

export interface DeviceFingerprint {
  hash: string;
  components: Record<string, any>;
  botDetection: { isBot: boolean; signals: string[] };
}

// Behavior tracking for bot detection
export class BehaviorTracker {
  private keyTimings: number[] = [];
  private lastKeyTime = 0;
  private submitTimes: number[] = [];
  private mouseMovements = 0;

  trackKeyPress() {
    const now = Date.now();
    if (this.lastKeyTime > 0) {
      this.keyTimings.push(now - this.lastKeyTime);
    }
    this.lastKeyTime = now;
  }

  trackMouseMove() {
    this.mouseMovements++;
  }

  trackSubmit() {
    this.submitTimes.push(Date.now());
  }

  getMetrics() {
    const avgKeyTiming = this.keyTimings.length > 0
      ? this.keyTimings.reduce((a, b) => a + b, 0) / this.keyTimings.length
      : 0;
    
    // Bot indicators: very uniform key timing, no mouse, rapid submits
    const keyVariance = this.keyTimings.length > 2
      ? Math.sqrt(this.keyTimings.map(t => Math.pow(t - avgKeyTiming, 2)).reduce((a, b) => a + b, 0) / this.keyTimings.length)
      : 999;

    const isSuspicious = (
      (keyVariance < 5 && this.keyTimings.length > 5) || // Too uniform typing
      (this.mouseMovements === 0 && this.keyTimings.length > 10) || // No mouse at all
      (this.submitTimes.length >= 3 && 
       this.submitTimes[this.submitTimes.length - 1] - this.submitTimes[this.submitTimes.length - 3] < 5000) // 3 submits in 5s
    );

    return {
      avgKeyTiming: Math.round(avgKeyTiming),
      keyVariance: Math.round(keyVariance),
      mouseMovements: this.mouseMovements,
      totalKeyPresses: this.keyTimings.length,
      submitCount: this.submitTimes.length,
      isSuspicious,
    };
  }
}

// Main function to generate fingerprint
export async function generateFingerprint(): Promise<DeviceFingerprint> {
  const canvasFP = getCanvasFingerprint();
  const webglFP = getWebGLFingerprint();
  const audioFP = await getAudioFingerprint();
  const hardware = getHardwareSignals();
  const fontFP = getFontFingerprint();
  const botResult = detectBot();

  const components = {
    canvas: canvasFP.substring(0, 100), // truncate for storage
    webgl: webglFP,
    audio: audioFP.substring(0, 100),
    fonts: fontFP.substring(0, 200),
    ...hardware,
    userAgent: navigator.userAgent,
  };

  // Create stable fingerprint string from key signals
  const stableString = [
    canvasFP,
    webglFP,
    audioFP,
    hardware.cores,
    hardware.memory,
    hardware.screenWidth,
    hardware.screenHeight,
    hardware.screenDepth,
    hardware.pixelRatio,
    hardware.timezone,
    hardware.platform,
    fontFP,
  ].join('|');

  const hash = await sha256(stableString);

  return { hash, components, botDetection: botResult };
}
