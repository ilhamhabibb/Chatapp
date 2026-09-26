# Design Tokens — Chating Arena

Sumber acuan: **Discord** (product UI, dark-first + light theme).
Diekstrak dari discord.com/branding + Discord DESIGN.md, 2026-09-25.

## Warna — Brand & aksen
| Token | Hex | Pemakaian |
|---|---|---|
| Blurple | `#5865F2` | SATU-SATUNYA aksen interaktif: CTA, link, mention, focus ring, state aktif |
| Blurple Hover | `#4752C4` | Hover button blurple |
| Blurple Active | `#3C45A5` | Pressed state |
| Light Blurple | `#E0E3FF` | Aksen soft di mode terang |
| Fuchsia | `#EB459E` | Badge premium / momen spesial (jarang) |

> Blurple legacy `#7289DA` **DILARANG** (deprecated sejak rebranding 2021).

## Permukaan — Dark (default)
| Token | Hex | Pemakaian |
|---|---|---|
| bg-3 (terdalam) | `#1E1F22` | Rail / chrome terluar |
| bg-2 | `#2B2D31` | Sidebar, member list |
| bg-1 (utama) | `#313338` | Surface chat yang dibaca user |
| bg-float | `#111214` | Popover, tooltip, context menu |
| modifier-hover | `rgba(78,80,88,0.3)` | Hover row |
| modifier-selected | `rgba(78,80,88,0.6)` | Row/channel aktif |

## Permukaan — Light
| Token | Hex | Pemakaian |
|---|---|---|
| bg-1 | `#FFFFFF` | Surface utama |
| bg-2 | `#F2F3F5` | Sidebar |
| bg-3 | `#E3E5E8` | Rail / surface terdalam |
| text | `#23272A` | Body text |
| text-muted | `#4E5058` | Metadata |
| border | `#E3E5E8` | Hairline |

## Teks — Dark
| Token | Hex | Pemakaian |
|---|---|---|
| heading | `#F2F3F5` | Judul, username |
| body | `#DBDEE1` | Body text (soft white, BUKAN `#FFFFFF`) |
| muted | `#949BA4` | Metadata, caption |
| placeholder | `#87898C` | Placeholder input |
| link | `#00A8FC` | Link |

## Semantik (dua mode)
| Token | Dark | Light | Pemakaian |
|---|---|---|---|
| green | `#23A55A` | `#3BA55D` | Online, sukses, toggle ON |
| green-bright | `#57F287` | — | Aksen highlight |
| yellow | `#F0B232` | `#FEE75C` | Idle, warning lembut |
| red | `#ED4245` | `#ED4245` | Destructive, DND, error |
| red-bright | `#F23F43` | — | Badge mention |

> Hijau untuk sukses/status, **BUKAN** blurple. Status dot: hijau/kuning/merah/abu fixed.

## Radius
`4px` input & embed · `8px` button, card, modal · `16px` squircle (server icon) · `9999px` pill (CTA marketing, badge)

## Tipografi
- **Asumsi (harus dikonfirmasi):** Discord pakai `gg sans` (proprietary, tidak tersedia).
  Dipilih substitut terdekat: **Outfit** (geometric, hangat) untuk display/heading,
  **Inter** untuk body/UI (legibilitas terbaik untuk chat padat).
- Body: 14px/400–500 · Button 14px/500 · Section label 12px/600 **UPPERCASE** dengan tracking lebar
- Heading: weight 600–700, tracking rapat

## Depth
Kedalaman dari **surface stepping** (3 lapis #1E1F22 → #2B2D31 → #313338), **BUKAN** shadow berat.
Shadow hanya untuk overlay: `0 8px 16px rgba(0,0,0,0.24)`.

## Ciri khas yang dipakai di Chating Arena
1. **Rack 4 pemain** dengan status dot ala Discord (hijau/kuning/merah/abu)
2. **Aura blurple** di belakang hero — satu-satunya gradient, sebagai fokus visual
3. Pemisahan depth lewat 3 lapis surface,.flat tanpa shadow
