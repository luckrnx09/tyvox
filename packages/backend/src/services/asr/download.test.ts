import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadAtomic } from "./download.js";

function fakeResponse(body: Uint8Array): Response {
  return {
    ok: true,
    headers: new Headers({ "content-length": String(body.length) }),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(body);
        controller.close();
      },
    }),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("downloadAtomic", () => {
  it("downloads from the first working source", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetchMock);
    const dir = await mkdtemp(join(tmpdir(), "download-"));

    await downloadAtomic(["https://a.example.com/f", "https://b.example.com/f"], join(dir, "f"));

    expect(await readFile(join(dir, "f"))).toEqual(Buffer.from([1, 2, 3]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the next source on failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockResolvedValueOnce(fakeResponse(new Uint8Array([4, 5, 6])));
    vi.stubGlobal("fetch", fetchMock);
    const dir = await mkdtemp(join(tmpdir(), "download-"));

    await downloadAtomic(["https://a.example.com/f", "https://b.example.com/f"], join(dir, "f"));

    expect(await readFile(join(dir, "f"))).toEqual(Buffer.from([4, 5, 6]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when every source fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, headers: new Headers() }),
    );
    const dir = await mkdtemp(join(tmpdir(), "download-"));

    await expect(
      downloadAtomic(["https://a.example.com/f", "https://b.example.com/f"], join(dir, "f")),
    ).rejects.toThrow("Download failed from all sources");
  });

  it("accepts a download matching the expected sha256", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(new Uint8Array([1, 2, 3]))));
    const dir = await mkdtemp(join(tmpdir(), "download-"));

    await downloadAtomic(
      ["https://a.example.com/f"],
      join(dir, "f"),
      undefined,
      "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
    );

    expect(await readFile(join(dir, "f"))).toEqual(Buffer.from([1, 2, 3]));
  });

  it("rejects a tampered download and falls back to the next source", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(new Uint8Array([9, 9, 9])))
      .mockResolvedValueOnce(fakeResponse(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetchMock);
    const dir = await mkdtemp(join(tmpdir(), "download-"));

    await downloadAtomic(
      ["https://a.example.com/f", "https://b.example.com/f"],
      join(dir, "f"),
      undefined,
      "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
    );

    expect(await readFile(join(dir, "f"))).toEqual(Buffer.from([1, 2, 3]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when no source matches the expected sha256", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(new Uint8Array([9, 9, 9]))));
    const dir = await mkdtemp(join(tmpdir(), "download-"));

    await expect(
      downloadAtomic(
        ["https://a.example.com/f"],
        join(dir, "f"),
        undefined,
        "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      ),
    ).rejects.toThrow("Download failed from all sources");
  });
});
