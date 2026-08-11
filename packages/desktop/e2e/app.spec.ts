import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import electronPath from "electron";

let app: ElectronApplication | undefined;

test.beforeAll(async () => {
  app = await electron.launch({
    executablePath: electronPath as unknown as string,
    args: ["out/main/index.js"],
    env: { ...process.env },
  });
});

test.afterAll(async () => {
  await app?.close();
});

function electronApp(): ElectronApplication {
  if (!app) throw new Error("Electron app not launched");
  return app;
}

async function waitForWindow(query: string): Promise<Page> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const match = electronApp()
      .windows()
      .find((w) => w.url().includes(query));
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Window not found: ${query}`);
}

test("launches capsule and settings windows", async () => {
  const capsule = await waitForWindow("window=capsule");
  const settings = await waitForWindow("window=settings");
  expect(capsule).toBeTruthy();
  expect(settings).toBeTruthy();
  await expect(settings.getByRole("button", { name: "General" })).toBeVisible();
});

test("settings navigates all tabs", async () => {
  const settings = await waitForWindow("window=settings");
  for (const tab of ["Speech", "Language Model", "Actions", "Vocabulary", "About"]) {
    await settings.getByRole("button", { name: tab }).click();
    await expect(settings.getByRole("button", { name: tab })).toBeVisible();
  }
});

test("about tab shows app version from main process", async () => {
  const settings = await waitForWindow("window=settings");
  await settings.getByRole("button", { name: "About" }).click();
  await expect(settings.getByText(/Version \d+\.\d+/).first()).toBeVisible();
});
