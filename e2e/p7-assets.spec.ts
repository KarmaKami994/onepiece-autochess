import { expect, test } from "@playwright/test";
import { installRuntimeBoundaryChecks, openFreshVoyage } from "./helpers";

installRuntimeBoundaryChecks();

test("representative P7 assets load in-browser without breaking interaction", async ({
  page,
}) => {
  await openFreshVoyage(page);
  const assets = [
    ["existing-v2", "/assets/animations/luffy-v2/luffy-v2.png"],
    ["new-gb2-v2", "/assets/animations/koby-v2/koby-v2.png"],
    ["new-gb1-v2", "/assets/animations/akainu-v2/akainu-v2.png"],
    ["koala-v2", "/assets/animations/koala-v2/koala-v2.png"],
    ["new-pve-v2", "/assets/animations/vice-admiral-v2/vice-admiral-v2.png"],
    ["component", "/assets/items/jolly-roger-fragment.svg"],
    ["completed", "/assets/items/black-blade.svg"],
    ["trait-grant", "/assets/items/emperors-jolly-roger.svg"],
    ["emperor-trait", "/assets/traits/emperor.svg"],
    ["form-portrait", "/assets/forms/luffy-gear-4-boundman/portrait.svg"],
    ["form-token", "/assets/forms/luffy-gear-4-boundman/token.svg"],
    ["late-completed", "/assets/items/phoenix-feather.svg"],
  ] as const;

  await page.evaluate((entries) => {
    const gallery = document.createElement("section");
    gallery.dataset.testid = "p7-browser-gallery";
    Object.assign(gallery.style, {
      position: "fixed",
      inset: "8px",
      zIndex: "100000",
      display: "grid",
      gridTemplateColumns: "repeat(6, 80px)",
      gap: "6px",
      padding: "8px",
      width: "fit-content",
      height: "fit-content",
      background: "#071923",
    });
    for (const [id, src] of entries) {
      const image = document.createElement("img");
      image.dataset.assetId = id;
      image.src = src;
      image.alt = id;
      image.width = 72;
      image.height = 72;
      image.style.objectFit = "contain";
      gallery.append(image);
    }
    document.body.append(gallery);
  }, assets);

  const gallery = page.locator('[data-testid="p7-browser-gallery"]');
  await expect(gallery).toBeVisible();
  await expect(gallery.locator("img")).toHaveCount(assets.length);
  await expect.poll(async () => gallery.locator("img").evaluateAll((images) =>
    images.every((image) => {
      const element = image as HTMLImageElement;
      return element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;
    }),
  )).toBe(true);

  await gallery.evaluate((element) => element.remove());
  const recruit = page.locator("button.shop-card:not([disabled])").first();
  await recruit.click();
  await expect(page.getByRole("button", { name: "DEPLOY", exact: true }))
    .toBeVisible();
});
