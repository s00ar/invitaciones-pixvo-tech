import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

// Original geometric animation for automated tests, with no external assets.
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await mkdir("tests/fixtures", { recursive: true });
  for (const [name, color] of [
    ["red", "#d02020"],
    ["blue", "#2030d0"],
  ]) {
    const bytes = await page.evaluate(async (color) => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      let frame = 0;
      const draw = () => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 320, 180);
        ctx.fillStyle = "white";
        ctx.fillRect((frame++ * 8) % 280, 150, 20, 20);
      };
      draw();
      const stream = canvas.captureStream(15);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8",
      });
      const chunks = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      const stopped = new Promise((resolve) => {
        recorder.onstop = () => resolve();
      });
      const timer = setInterval(draw, 60);
      recorder.start();
      await new Promise((resolve) => setTimeout(resolve, 2400));
      recorder.stop();
      await stopped;
      clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
    }, color);
    await writeFile(`tests/fixtures/${name}.webm`, new Uint8Array(bytes));
  }
} finally {
  await browser.close();
}
