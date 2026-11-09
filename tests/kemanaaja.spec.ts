import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const BASE_URL: string = "http://localhost:8080";

test("alur dasar: tanggal opsional dan syarat minimal 3 anggota", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.getByText("terserah")).toBeVisible();

  // R-17: cek apakah ada autentikasi
  const auth = await page.getByText(/magic link|otp|masuk|login/i).count();
  console.log("R-17 autentikasi terdeteksi di beranda:", auth > 0);

  // R-19: tanggal dikosongkan
  await page.getByLabel(/nama rencana/i).fill("Kumpul Weekend");
  await page.getByRole("button", { name: /buat rencana/i }).click();
  await expect(page).toHaveURL(/\/room\/[^/]+$/, { timeout: 20_000 });
  await expect(page.getByRole("button", { name: /1\.\s*Ajak & Preferensi/ })).toBeVisible();

  await page.getByLabel("Nama").fill("Raka");
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

  const addMember = async (
    name: string,
    budget: string,
    expectedMemberCount: number,
  ): Promise<Page> => {
    const ctx = await browser.newContext();
    const memberPage = await ctx.newPage();
    await memberPage.goto(inviteLink);
    await memberPage.getByLabel("Nama").fill(name);
    await memberPage.locator("input[type=range]").fill(budget);
    await memberPage.getByLabel("Area terdekat").selectOption({ label: "Jakarta Selatan" });
    await memberPage.getByRole("button", { name: "Kopi" }).click();
    await memberPage.getByRole("button", { name: "Simpan preferensi" }).click();
    await expect(owner.getByText(new RegExp(`${expectedMemberCount} anggota`))).toBeVisible();
    return memberPage;
  };
  const nadia = await addMember("Nadia", "50000", 2);
  const bima = await addMember("Bima", "90000", 3);

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
  await owner.getByRole("button", { name: /ke voting/i }).click();
  const votingStart = owner.waitForResponse((response) =>
    response.url().includes("/rest/v1/rpc/start_voting"),
  );
  await owner.getByRole("button", { name: /mulai voting/i }).click();
  expect((await votingStart).ok()).toBeTruthy();
  await owner.reload();
  await owner.getByRole("button", { name: /3\.\s*Voting/ }).click();
  const rakaCard = owner.getByText("Raka memilih:").locator("..");
  const saveRakaVote = async (place: RegExp) => {
    const save = owner.waitForResponse(
      (response) =>
        response.url().includes("/rest/v1/rooms") && response.request().method() === "PATCH",
    );
    await rakaCard.getByRole("button", { name: place }).click();
    expect((await save).ok()).toBeTruthy();
  };
  await saveRakaVote(/Kopi Lumbung/);
  await expect(owner.getByText("1 dari 3 anggota sudah voting")).toBeVisible();
  await expect(owner.getByText("Hasil sementara")).toHaveCount(0);
  await saveRakaVote(/Kedai Kopi Kemang/);
  await expect(owner.getByText("1 dari 3 anggota sudah voting")).toBeVisible();

  // owner mengunci, anggota lain tidak punya tombol kunci
  await expect(nadia.getByRole("button", { name: /kunci keputusan/i })).toHaveCount(0);
  await owner.getByRole("button", { name: /kunci keputusan/i }).click();
  await owner.getByText("Kunci keputusan sekarang?").waitFor();
  const decisionLock = owner.waitForResponse((response) =>
    response.url().includes("/rest/v1/rpc/lock_decision"),
  );
  await owner.getByRole("button", { name: /ya, kunci/i }).click();
  expect((await decisionLock).ok()).toBeTruthy();
  await owner.reload();
  await expect(owner.getByText(/Decision Card/i)).toBeVisible();

  // R-19: tanggal bukan format ISO
  await expect(owner.getByText(/\d{4}-\d{2}-\d{2}/)).toHaveCount(0);
});
