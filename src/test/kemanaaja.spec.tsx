import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const BASE_URL: string = process.env["BASE_URL"] ?? "http://localhost:8000";

test("alur dasar: tanggal opsional dan syarat minimal 3 anggota", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.getByText("terserah")).toBeVisible();

  // R-17: cek apakah ada autentikasi
  const auth = await page.getByText(/magic link|otp|masuk|login/i).count();
  console.log("R-17 autentikasi terdeteksi di beranda:", auth > 0);

  // R-19: tanggal dikosongkan
  await page.getByLabel(/nama rencana/i).fill("Kumpul Weekend");
  await page.getByRole("button", { name: /buat rencana/i }).click();
  await expect(page.getByText("1. Ajak & Preferensi")).toBeVisible();

  await page.getByLabel("Area terdekat").selectOption({ label: "Jakarta Selatan" });
  await page.getByRole("button", { name: "Kopi" }).click();
  await page.getByRole("button", { name: "Simpan preferensi" }).click();
  await expect(page.getByText("Preferensi tersimpan")).toBeVisible();

  // R-01: dengan 1 anggota tombol harus nonaktif
  await expect(page.getByRole("button", { name: /lihat rekomendasi/i })).toBeDisabled();
});

test("grup 3 anggota: rekomendasi, voting tersembunyi, kunci oleh owner", async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  await owner.goto(BASE_URL);
  await owner.getByLabel(/nama rencana/i).fill("Tes Grup");
  await owner.getByRole("button", { name: /buat rencana/i }).click();
  const inviteLink = await owner
    .getByText(/https?:\/\/\S+/)
    .first()
    .innerText();

  await owner.getByLabel("Nama").fill("Raka");
  await owner.locator("input[type=range]").fill("75000");
  await owner.getByLabel("Area terdekat").selectOption({ label: "Jakarta Selatan" });
  await owner.getByRole("button", { name: "Kopi" }).click();
  await owner.getByRole("button", { name: "Simpan preferensi" }).click();

  const addMember = async (name: string, budget: string): Promise<Page> => {
    const ctx = await browser.newContext();
    const memberPage = await ctx.newPage();
    await memberPage.goto(inviteLink);
    await memberPage.getByLabel("Nama").fill(name);
    await memberPage.locator("input[type=range]").fill(budget);
    await memberPage.getByLabel("Area terdekat").selectOption({ label: "Jakarta Selatan" });
    await memberPage.getByRole("button", { name: "Kopi" }).click();
    await memberPage.getByRole("button", { name: "Simpan preferensi" }).click();
    return memberPage;
  };
  const [nadia, bima] = await Promise.all([
    addMember("Nadia", "50000"),
    addMember("Bima", "90000"),
  ]);

  // R-03: budget anggota lain tidak boleh tampil di halaman
  await expect(nadia.getByText("Rp90.000")).toHaveCount(0);
  await expect(bima.getByText("Rp50.000")).toHaveCount(0);

  // R-01 dan R-02
  await owner.reload();
  const tombol = owner.getByRole("button", { name: /lihat rekomendasi/i });
  await expect(tombol).toBeEnabled();
  await tombol.click();
  const harga = await owner.getByText(/Rp[\d.]+|Gratis/).allInnerTexts();
  expect(harga.length).toBeGreaterThanOrEqual(3);
  expect(harga.length).toBeLessThanOrEqual(5);
  for (const h of harga) {
    const angka = h === "Gratis" ? 0 : Number(h.replace(/\D/g, ""));
    expect(angka).toBeLessThanOrEqual(50000);
  }

  // R-07 dan R-12: voting, hasil tersembunyi, suara boleh diubah
  await owner.getByRole("button", { name: /mulai voting/i }).click();
  await owner.locator("button", { hasText: "Kopi" }).first().click();
  await expect(owner.getByText(/\d+\s*(dari|\/)\s*\d+.*(voting|memilih)/i)).toBeVisible();
  await expect(owner.getByText("Hasil sementara")).toHaveCount(0);
  await owner.locator("button", { hasText: "Kopi" }).last().click();

  // owner mengunci, anggota lain tidak punya tombol kunci
  await expect(nadia.getByRole("button", { name: /kunci keputusan/i })).toHaveCount(0);
  await owner.getByRole("button", { name: /kunci keputusan/i }).click();
  await expect(owner.getByText("DECISION CARD")).toBeVisible();

  // R-19: tanggal bukan format ISO
  await expect(owner.getByText(/\d{4}-\d{2}-\d{2}/)).toHaveCount(0);
});
