// @ts-check
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Native Browser & Headless Bypass Runner
 * Bypasses missing Playwright drivers by leveraging installed Chrome/Edge executables
 * or direct HTTP rendering with realistic browser headers.
 */
export class NativeBrowserRunner {
  constructor() {
    this.knownBrowserPaths = [
      // Environment variable override (Docker / Cloud / Custom)
      process.env.CHROME_PATH,
      // Linux / Alpine / Render / Ubuntu paths
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/snap/bin/chromium",
      // Windows paths
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      // macOS paths
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    ].filter(Boolean);

    this.detectedBrowser = this.detectNativeBrowser();
    this.history = [];
    this.maxHistory = 50;
  }

  /**
   * Detect installed Chrome or Edge executable on the system
   * @returns {string|null}
   */
  detectNativeBrowser() {
    for (const p of this.knownBrowserPaths) {
      try {
        if (existsSync(p)) {
          return p;
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * Get runner status and available bypass drivers
   */
  getStatus() {
    const browser = this.detectNativeBrowser();
    return {
      service: "NativeBrowserRunner",
      status: browser ? "NATIVE_BROWSER_READY" : "HTTP_FALLBACK_READY",
      browserExecutable: browser,
      driverType: browser ? (browser.includes("Edge") ? "MICROSOFT_EDGE_NATIVE" : "GOOGLE_CHROME_NATIVE") : "HTTP_FETCH_STREAM",
      bypassedPlaywright404: true,
      supportedModes: ["NATIVE_DUMP_DOM", "DIRECT_HTTP_SCRAPE", "HEADLESS_NEW"],
      recentQueriesCount: this.history.length
    };
  }

  /**
   * Fetch web page content bypassing Playwright driver requirements
   * Uses native Chrome `--dump-dom` if available, or direct high-fidelity HTTP fetch.
   * @param {string} url
   * @param {Object} [options]
   * @param {number} [options.timeoutMs=15000]
   * @param {boolean} [options.preferHttp=false]
   */
  async fetchPage(url, options = {}) {
    const timeoutMs = options.timeoutMs || 15000;
    const preferHttp = options.preferHttp ?? false;
    const browser = this.detectNativeBrowser();

    const record = {
      url,
      timestamp: new Date().toISOString(),
      method: (browser && !preferHttp) ? "NATIVE_CHROME_DUMP_DOM" : "DIRECT_HTTP_FETCH",
      success: false
    };

    // 1. Try Native Headless Chrome dump-dom if available and not explicitly preferring HTTP
    if (browser && !preferHttp) {
      try {
        const { stdout } = await execFileAsync(
          browser,
          [
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--dump-dom",
            url
          ],
          { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }
        );

        record.success = true;
        record.contentLength = stdout.length;
        this._recordHistory(record);

        return {
          success: true,
          url,
          engine: "NATIVE_BROWSER_CLI",
          browser: browser.includes("Edge") ? "Microsoft Edge" : "Google Chrome",
          html: stdout,
          length: stdout.length,
          bypassed: true
        };
      } catch (err) {
        // Fall through to Direct HTTP
        record.nativeBrowserError = err.message;
      }
    }

    // 2. Direct HTTP Fetch Bypass with realistic browser user-agent
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-Ch-Ua": '"Chromium";v="130", "Google Chrome";v="130"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1"
        }
      });
      clearTimeout(timer);

      const html = await res.text();
      record.success = res.ok;
      record.status = res.status;
      record.contentLength = html.length;
      this._recordHistory(record);

      return {
        success: res.ok,
        status: res.status,
        url,
        engine: "DIRECT_HTTP_CLIENT",
        html,
        length: html.length,
        bypassed: true
      };
    } catch (err) {
      record.error = err.message;
      this._recordHistory(record);
      return {
        success: false,
        url,
        engine: "DIRECT_HTTP_CLIENT",
        error: err.message,
        bypassed: true
      };
    }
  }

  _recordHistory(record) {
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
}

export const nativeBrowserRunner = new NativeBrowserRunner();
