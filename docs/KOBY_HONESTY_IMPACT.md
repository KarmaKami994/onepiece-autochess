# Koby — Honesty Impact

## Training and ability

A Koby who starts a real PvE or PvP voyage battle advances by one training battle, win or loss. A real captain facing a ghost earns training for their deployed Koby. Training for the roster is applied after all outcomes are simulated, including ghost copies, so the battle that earns the fourth point freezes the original form and ability. Koby starts his next battle with Honesty Impact. Bench copies and Team Planner simulations earn no training.

The optional schema-6 `kobyTrainingBattles` field belongs to the unit, starts at zero and caps at four. A star merge keeps the highest count among the merged copies. The persistent form keeps Koby's shop identity, Navy/Brawler traits, one-gold cost, star, items and base stats. Honesty Impact trades Shave Strike's lunge for area damage around the nearest enemy in range. Its base power is 165 and its damage type is Physical. GameContent is `1.38.0` on this isolated branch.

The selected-crew inspector shows accumulated training. The Codex and the Planner show the unlock condition. Stored active battle snapshots keep their original form assignments on restore.

## PAC comparison

**Adapted:** PAC Cosmog's evolution is gated by eight per-instance stacks. In the pinned PAC evolution manager, another Pokémon's evolution advances Cosmog's stacks and adds max HP. Koby uses the same premise of a per-instance threshold, with actual deployment replacing allied evolution as the counted event. PAC's eight-stack threshold, HP award and divergent evolution are reference only. The voyage uses its existing phase transition, persistent form resolver and save. [Pinned Cosmog definition](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/pokemon.ts#L14863-L14879) · [Pinned stack award](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/evolution-logic/evolution-manager.ts#L94-L103)

## Presentation and provenance

The base character retains the Sprite Database sheet contributed by Maverick PK for *One Piece: Gigant Battle! 2 — New World*. The form uses Treasure Cruise #4250's actual character frames, Marine outfit, pink hair, green goggles and red-black Haki. The source page returned HTTP 403 during automated retrieval. The owner supplied the exact PNG on 2026-11-19 under the prior One Piece game-asset reuse attestation. The individual submitter is unconfirmed. [Base Coby sheet](https://spritedatabase.net/file/14568) · [Treasure Cruise #4250](https://www.spriters-resource.com/mobile/onepiecetreasurecruise/asset/264077/) · [Official visual reference](https://tamashiiweb.com/item/15199/?lang=en&wovn=en)

`scripts/assets/build_koby_form_poses.mjs` pins the source and extracts source rectangles with one nearest-neighbor scale. Original pose sequences cover idle, move, attack and cast. The hit and defeat clips use holds and offsets of the original braced pose. The cast uses the original extended punch and lightning. The v2 builder packs those clips into the 46-frame contract at the standard foot pivot. Portrait, token, overlay and atlas all load locally. The existing base animation remains the fallback if the form atlas cannot load.

Rebuild the pose board and the three static assets with `node scripts/assets/build_koby_form_poses.mjs`. Pack the atlas with `node scripts/build_v2_assets.mjs --asset koby-honesty-impact`.

| File | SHA-256 |
| --- | --- |
| `art/licensed-reference/treasure-cruise/Coby-4250.png` | `85e3455d437298754df1f9681a847acfef68c1ad53ea5e02c44c3b161a3d5d8a` |
| `art/production/koby-honesty-impact/poses.png` | `c2246cd2b950ebecc912a08f43746c3990f19f4ffe6d0a6f7853a2254c93c53f` |
| `art/production/koby-honesty-impact/frame-map.json` | `7690247ed1e552f2fbc58404c4be04c4a3bd1b6e6252978edc4f528b0389bf96` |
| `public/assets/animations/koby-honesty-impact-v2/koby-honesty-impact-v2.png` | `05da57cb76e795fb8102fcf593be359d00f45c4a238ef0628e940c9e328d3f76` |
| `public/assets/animations/koby-honesty-impact-v2/koby-honesty-impact-v2.json` | `f7390c5f9173f696ac6947b8653890f4ba10d0e2bdec387f08ffd456a5e39820` |
| `public/assets/forms/koby-honesty-impact/portrait.svg` | `e2192b43e74a64ae5ec67fd25f924d7004c9b96243f89cfa76414972d0570439` |
| `public/assets/forms/koby-honesty-impact/token.svg` | `bc690141729d99266de43e4a19ab9194f2b30cd2a1751d0b03f8066695858d50` |
| `public/assets/forms/koby-honesty-impact/overlay.svg` | `ddad166aef41cafcceefc607081c23350fd4ac0e8c3a90c85de6a370a8158a29` |
