# Chating Arena

Web chat real-time plus game multiplayer arena, satu server, satu basis data.
Antarmuka berbahasa Indonesia, jalan di laptop maupun HP (desktop & mobile) melalui
jaringan lokal (LAN).

Dua fitur utamanya:

- **Chat real-time** — percakapan privat (1-on-1) dan ruang publik (lobby).
  Pesan, indikator "seseorang sedang mengetik", dan notifikasi segera terkirim lewat
  WebSocket tanpa refresh.
- **Game multiplayer** — room berisi kode 4 karakter. Pemain saling bergerak di arena
  2D, mengumpulkan token, menghindari hazard, dan beradu skor selama 90 detik.
  Direksi diberikan lewat tombol keyboard (desktop) atau joystick virtual (mobile).

---

## Daftar Isi

- [Teknologi](#teknologi)
- [Arsitektur](#arsitektur)
- [Fitur](#fitur)
- [Menjalankan Proyek](#menjalankan-proyek)
- [Akses dari HP (LAN)](#akses-dari-hp-lan)
- [Akun Demo](#akun-demo)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Perintah yang Tersedia](#perintah-yang-tersedia)
- [Kekurangan Saat Ini](#kekurangan-saat-ini)
- [Potensi Pengembangan](#potensi-pengembangan)
- [Catatan Keamanan](#catatan-keamanan)

---

## Teknologi

| Lapisan | Teknologi | Versi |
| --- | --- | --- |
| Frontend | Next.js (App Router) | 16.x |
| UI | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| Game 2D | Phaser | 3.90 |
| Client realtime | Socket.IO Client | 4.8 |
| Backend | NestJS + Fastify | 12.x / 5.x |
| WebSocket | Socket.IO (server) | 4.8 |
| ORM | Prisma | 6.19 |
| Database | PostgreSQL | — |
| Cache/session | Redis (ioredis) | 5.8 |
| Hash password | argon2 | 0.45 |
| Validasi | Zod | 4.6 |
| Bahasa | TypeScript | 5.9 |
| Test | Vitest | 5.x |
| Build frontend | Turbopack (dev) / Next build (prod) | — |

Monorepo berbasis **npm workspaces** dengan tiga paket:

```
chatapp/
├── apps/
│   ├── web/          # Next.js — seluruh UI
│   └── realtime/     # NestJS — REST API + WebSocket gateway
└── packages/
    └── contracts/    # tipe & enum yang dipakai bersama web & realtime
```

Paket `contracts` adalah sumber kebenaran untuk bentuk payload WebSocket, enum status
game, dan tipe DTO, sehingga frontend dan backend tidak bisa berbeda paham.

---

## Arsitektur

**Backend** terbagi per domain di `apps/realtime/src/`:

```
auth/       registrasi, login, verifikasi email, reset password, sesi
chat/       service, REST controller, Socket.IO gateway
game/       service + engine (logika arena), repository, gateway
users/      pencarian user, profil
common/     helper validasi, filter error, response envelope
config/     skema env +(origin allowlist)
redis/      koneksi & repository Redis
```

Alur request:

- **REST** untuk operasi yang butuh HTTP semantics: login, buat room, riwayat pesan,
  cari user. Semua dibungkus envelope `{ success, data, message }`.
- **WebSocket** untuk lalu lintas dua arah yang perlu instan: kirim pesan, indikator
  mengetik, dan input gerakan game.

State room game **berada di memori server** (`Map` pada `GameService`) supaya tidak
mengecek database 15×/detik. Postgres hanya dipakai untuk hal yang persisten: room,
peserta, skor akhir, dan riwayat.

Sesi login disimpan di **Redis** dengan token acak pada cookie `httpOnly`. Password
di-hash dengan argon2. Tidak ada JWT.

---

## Fitur

**Autentikasi**

- Registrasi, login, logout, verifikasi email, lupa & reset password
- Sesi di server (Redis), bukan token_decode di client
- Proteksi brute force pada login (hash dummy untuk email tidak terdaftar agar waktu
  respons seragam)

**Chat**

- Percakapan privat 1-on-1 dan ruang publik
- Riwayat pesan dengan cursor pagination
- Indikator mengetik
- Realtime masuk & keluar, tetap benar setelah socket reconnect
- Pencarian user untuk memulai chat privat
- Role anggota: owner, moderator, member

**Game**

- Room 4 karakter, host memulai round setelah semua pemain siap
- Arena 2D 960×540; token +10 skor, hazard bergerak
- Countdown → 90 detik bermain → papan skor, tersimpan ke database
- Rematch, reconnect, danspectator state
- Joystick virtual untuk layar sentuh, keyboard (WASD / panah) untuk desktop

**Responsif**

- Layout penuh di desktop; sidebar jadi drawer di layar sempit
- Ukuran 320px hingga 1440px sudah diuji tanpa horizontal overflow
- Tema terang/gelap

---

## Menjalankan Proyek

### Kebutuhan

| Kebutuhan | Versi |
| --- | --- |
| Node.js | 20+ (dibangun & diuji di Node 22) |
| npm | 10+ |
| PostgreSQL | 14+ |
| Redis | 6+ |

---

### Langkah 1 — Clone & install dependensi

```bash
git clone <url-repo-anda> chating-arena
cd chating-arena
npm install
```

---

### Langkah 2 — Siapkan PostgreSQL

Buat database dan user:

```bash
sudo -u postgres psql
```

```sql
CREATE USER chating WITH PASSWORD 'chating';
CREATE DATABASE chating OWNER chating;
```

Atau pakai Docker:

```bash
docker run -d --name chating-postgres \
  -e POSTGRES_USER=chating \
  -e POSTGRES_PASSWORD=chating \
  -e POSTGRES_DB=chating \
  -p 5432:5432 postgres:16
```

---

### Langkah 3 — Siapkan Redis

```bash
docker run -d --name chating-redis -p 6379:6379 redis:7
```

Atau Redis lokal:

```bash
sudo systemctl start redis-server
```

---

### Langkah 4 — Buat file `.env`

```bash
cp .env.example .env
```

Nilai default di `.env.example` sudah cocok dengan langkah 2 dan 3 di atas
(`postgresql://chating:chating@localhost:5432/chating` dan `redis://localhost:6379`),
jadi untuk dijalankan di laptop sendiri tidak perlu diubah apa pun.

Kalau nama user/password PostgreSQL Anda berbeda, sesuaikan baris `DATABASE_URL`.
Detail semua variabel ada di [Variabel Lingkungan](#variabel-lingkungan).

> **Penting untuk Node 22+:** `npm install` dapat gagal membangun `argon2` (native
> module). Install saja build tool-nya lebih dulu:
>
> ```bash
> # Debian/Ubuntu
> sudo apt-get install -y build-essential python3
> ```

---

### Langkah 5 — Siapkan skema database & data demo

```bash
npm run prisma:generate --workspace @chating/realtime
npm run prisma:migrate --workspace @chating/realtime
npm run prisma:seed --workspace @chating/realtime
```

`migrate` membuat tabel, `seed` mengisi 4 user demo plus satu room & percakapan contoh
(lihat [Akun Demo](#akun-demo)).

---

### Langkah 6 — Jalankan

```bash
npm run dev
```

Dua proses dijalankan bersamaan:

| Layanan | Alamat |
| --- | --- |
| Web (Next.js) | http://localhost:3000 |
| Realtime API + WebSocket | http://localhost:4000 |

Buka **http://localhost:3000**, lalu daftar atau masuk dengan akun demo.

---

### Langkah 7 — (opsional) Mode produksi

```bash
npm run build
npm run start --workspace @chating/web      # http://localhost:3000
npm run start --workspace @chating/realtime # http://localhost:4000
```

> Mode produksi **menolak jalan** bila `WEB_ORIGIN` kosong atau `EMAIL_PROVIDER` masih
> `console`. Keduanya disengaja — lihat [Catatan Keamanan](#catatan-keamanan).

---

## Akses dari HP (LAN)

Server dev sudah listen di semua interface, jadi HP di Wi-Fi yang sama bisa mengakses
langsung. Yang perlu diubah hanya **origin** supaya CORS mengizinkan alamat tersebut.

1. Cari IP komputer di jaringan:

   ```bash
   hostname -I        # Linux
   ipconfig getifaddr en0   # macOS
   ```

   Contoh hasilnya `192.168.0.104`.

2. Tambahkan IP itu ke `WEB_ORIGIN` di `.env`:

   ```ini
   WEB_ORIGIN=http://localhost:3000,http://192.168.0.104:3000
   ```

   `ALLOW_PRIVATE_ORIGIN=true` (nilai default di mode development) yang mengizinkan
   alamat jaringan privat. Untuk mengizinkan lebih dari satu IP, cukup pisahkan dengan
   koma seperti contoh di atas.

3. Restart `npm run dev`.

4. Buka `http://192.168.0.104:3000` di browser HP.

Port API tidak perlu diubah: browser mengambil hostname dari alamat yang sedang dibuka,
lalu memakai port yang sama dengan `NEXT_PUBLIC_API_URL` (`4000`). Jadi HP mengakses
API di `http://192.168.0.104:4000` otomatis.

> **Catatan keamanan:** cookie sesi memakai flag `Secure` hanya di mode produksi. Means
> HTTP biasa (tanpa TLS) hanya aman di jaringan pribadi — jangan dipakai di internet
> terbuka.

---

## Akun Demo

Dari `npm run prisma:seed`. Password semua akun: `password123`

| Username | Email | Nama |
| --- | --- | --- |
| `andi` | andi@demo.local | Andi Pratama |
| `bunga` | bunga@demo.local | Bunga Lestari |
| `citra` | citra@demo.local | Citra Dewi |
| `dimas` | dimas@demo.local | Dimas Nugroho |

Untuk mencoba fitur realtime, buka **dua browser (atau satu normal + satu incognito)**
dan masuk sebagai dua akun berbeda, lalu kirim pesan atau join room game yang sama.

> Akun ini sengaja memakai password yang dipublikasikan. Jangan pernah menjalankan
> seed di server sungguhan.

---

## Variabel Lingkungan

Semua variabel dibaca dari `.env` di root.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` / `test` / `production` |
| `PORT` | `4000` | Port API realtime |
| `WEB_ORIGIN` | `http://localhost:3000` | Origin web yang diizinkan (CORS REST + handshake WebSocket). Pisahkan dengan koma untuk beberapa origin. **Wajib** di produksi. |
| `ALLOW_PRIVATE_ORIGIN` | — | `true`/`false`. Default `true` di luar produksi, `false` di produksi. Mengizinkan origin `localhost`, `10.x`, `192.168.x`, `172.16-31.x`. |
| `COOKIE_SECURE` | mengikuti `NODE_ENV` | Flag `Secure` pada cookie sesi. Produksi menolak `false`. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Host + port API. Browser mengambil hostname halaman sendiri, jadi yang penting cuma portnya. |
| `DATABASE_URL` | — | Koneksi PostgreSQL. **Wajib.** |
| `REDIS_URL` | `redis://localhost:6379` | Koneksi Redis. **Wajib.** |
| `SESSION_COOKIE_NAME` | `chating_session` | Nama cookie sesi |
| `SESSION_TTL_SECONDS` | `604800` | Masa berlaku sesi (7 hari) |
| `EMAIL_PROVIDER` | `console` | Provider email. Produksi menolak `console`. |
| `EMAIL_FROM` | `no-reply@example.test` | Alamat pengirim |
| `EMAIL_API_KEY` | — | API key provider email |

---

## Perintah yang Tersedia

Dari root repo:

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Jalankan web + realtime sekaligus |
| `npm run build` | Build semua workspace |
| `npm run typecheck` | Cek tipe TypeScript di semua workspace |
| `npm test` | Jalankan test (Vitest) |
| `npm run lint` | Perintah tersedia, tapi **belum ada linter** yang dikonfigurasi — jadi saat ini tidak menjalankan apa pun |

Khusus `@chating/realtime`:

| Perintah | Fungsi |
| --- | --- |
| `npm run prisma:generate --workspace @chating/realtime` | Generate Prisma Client |
| `npm run prisma:migrate --workspace @chating/realtime` | Buat/terapkan migrasi |
| `npm run prisma:seed --workspace @chating/realtime` | Isi data demo |

---

## Kekurangan Saat Ini

Hal-hal yang **belum** ada atau masih terbatas, supaya tidak ada kejutan:

**Keamanan & operasional**

- **Belum ada rate limiting.** Endpoint login, registrasi, dan lupa-password bisa
  dipanggil tanpa batas. Iniuelingan risiko brute force dan email spam. Prioritas
  tertinggi untuk tackle berikutnya.
- **Provider email belum diimplementasikan.** `EMAIL_PROVIDER` hanya menerima
  `console`, yang mencetak tautan reset ke terminal. Akibatnya mode produksi
  sengaja gagal start sampai ada provider sungguhan (SMTP/Resend/SES) — lebih baik
  gagal start daripada diam-diam mencetak token ke log.
- **Tanpa HTTPS di mode development**, jadi cookie sesi terbaca dalam jaringan. Wajar
  untuk LAN, tidak untuk publik.
- **Tidak ada verifikasi email yang dipaksakan.** Akun bisa langsung dipakai tanpa
  klik tautan verifikasi.
- **Tidak ada refresh token.** Sesi 7 hari lalu pengguna harus login ulang.
- **Seed tidak dilindungi sepenuhnya.** Ada guard terhadap database produksi, tapi
  `EMAIL_PROVIDER=console` masih diperbolehkan tanpa peringatan tambahan.

**Arsitektur**

- **State game hanya di memori.** Kalau proses restart di tengah round, round itu
  hilang. Menyimpan state ke Redis akan memungkinkan beberapa instance server.
- **Tidak bisa horizontal scale.** Karena game state in-memory dan Socket.IO default
  (bukan Redis adapter), dua instance di belakang load balancer tidak akan saling
  sinkron. Butuh adapter + state sharing lebih dulu.
- **Riwayat pesan dimuat penuh-ish** dengan cursor pagination 30 item per halaman; belum
  ada infinite scroll di semua tampilan.
- **Tidak ada upload gambar/file.** Pesan hanya teks.

**Fitur**

- **Tidak ada notifikasi push** — aplikasi harus terbuka agar notifikasi masuk.
- **Tidak ada pencarian pesan** dalam percakapan.
- **Tidak ada edit atau hapus pesan.**
- **Game hanya satu mode** (arena 2D collecting token), belum ada leaderboard global
  atau riwayat match yang bisa disorot.
- **Tidak ada test end-to-end.** Yang ada baru unit test service, engine game, dan
  validasi; alur multi-pengguna diuji manual lewat browser.
- **Belum ada linter.** `npm run lint` sudah ada di root tapi tidak ada ESLint/Biome
  yang dipasang, jadi kode belum pernah diformat atau di-lint otomatis.
- **Belum ada CI/CD, Dockerfile, atau docker-compose** untuk seluruh aplikasi —
  Postgres dan Redis saja yang bisa dipakai lewat Docker.
- **Belum ada migrations di produksi** (alur `prisma migrate dev` khusus pengembangan).

---

## Potensi Pengembangan

Prioritas yang masuk akal, dari yang paling bernilai:

**Prioritas tinggi**

1. **Rate limiting** di endpoint auth dengan Redis sebagai store (udah ada Redis, jadi
   tinggal pakai). Melindungi dari brute force dan email spam.
2. **Provider email sungguhan** + setup produksi yang benar (HTTPS + `WEB_ORIGIN`
   dengan domain asli). Ini memblokir mode produksi, jadi ini prasyarat deploy.
3. **Test end-to-end** (Playwright) untuk alur critical: register → login → kirim
   pesan antar 2 browser → join room game → main._manual sekarang bisa hilang begitu
   ada ini.
4. **Dockerfile + docker-compose** untuk web, realtime, postgres, redis — supaya
   "clone lalu jalan" jadi satu perintah.

**Prioritas menengah**

5. **State game di Redis** supaya restart tidak menghapus round, dan enables
   horizontal scaling.
6. **Refresh token + daftar perangkat**, dengan rotasi dan revocation.
7. **Pagination di UI** dengan infinite scroll, plus indikator "memuat
   pesan lama".
8. **Upload gambar** dengan signed URL (S3/compatible), preview inline, dan batas
   ukuran.
9. **Notifikasi push** via Web Push atau service worker.
10. **Pencarian pesan** (SQLite FTS5/Postgres `tsvector` untuk Bahasa Indonesia).

**Jangka panjang**

11. **Leaderboard & riwayat match** yang bisa dibaca semua pemain.
12. **Mode game tambahan**: duel 1-on-1, tim, atau mode dengan aturan berbeda.
13. **Obrolan video/audio** (WebRTC) — ini yang akan menguji scalability gate dan
    Hambatan skalabilitas yang sudah dijelaskan di atas.
14. **Moderasi**: laporkan pesan, blokir user, filter kata.
15. **Internationalization (i18n)** kalau akan dipakai di luar Indonesia.

---

## Catatan Keamanan

Yang sudah ditangani:

- Password di-hash dengan argon2
- Sesi disimpan di server (Redis), cookie `httpOnly` + `sameSite=lax`
- Timing seragam saat login (hash dummy untuk email tidak terdaftar)
- Token verifikasi & reset dipakai sekali secara atomik
- Reset password mencabut semua sesi lama
- Otorisasi dicek di service, bukan hanya di route
- CORS memakai allowlist eksplisit; origin private nonaktif di produksi
- Allowed origin dibandingkan penuh (bukan prefix), jadi `https://app.example.evil.test`
  tidak akan lolos
- Pesan dan input divalidasi dengan Zod, error ditulis dalam Bahasa Indonesia
- Nama room dan pesan di-escape React (aman dari XSS)
- Error produksi tidak pernah membocorkan stack trace
- Seed dan produksi punya guard

Yang **belum** dan perlu dikerjakan sebelum dipublikasikan: **rate limiting**,
**provider email**, **HTTPS**, dan **forcing verifikasi email**.

---

## Lisensi

Belum ditentukan. Tentukan lisensi sebelum repository dipublikasikan.
