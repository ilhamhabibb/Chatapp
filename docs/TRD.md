# TRD: Web Chat & Arena Skor

## Status
Dokumen ini adalah rancangan teknis berdasarkan PRD. Detail yang ditandai sebagai keputusan sementara harus dikonfirmasi sebelum implementasi.

## Stack Teknis

- **Bahasa:** TypeScript
- **Frontend:** Next.js dengan App Router dan React
- **Game client:** Phaser 3, top-down 2D, dengan kontrol keyboard dan touch
- **Realtime backend:** NestJS dengan Fastify adapter
- **Realtime transport:** Socket.IO dengan namespace chat dan game
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Cache, presence, dan pub/sub:** Redis
- **Validasi boundary:** Zod atau validator yang konsisten pada REST dan WebSocket
- **Password hashing:** Argon2id
- **Session:** HTTP-only, secure, same-site cookie
- **Testing:** unit test, integration test, WebSocket test, dan load test
- **Monorepo:** pnpm workspace dengan `apps/web`, `apps/realtime`, dan `packages/contracts` (proposed)

## Keputusan Arsitektur

Web UI dan realtime service dipisahkan. Next.js menangani rendering, halaman, dan client-side interaction. NestJS/Fastify menjadi satu-satunya layer yang menangani request API, autentikasi, persistence, WebSocket chat, dan game loop. Konsekuensinya, game tidak bergantung pada lifecycle serverless Next.js.

Sistem dimulai sebagai modular monolith dengan dua proses aplikasi, bukan banyak microservice. Boundary module tetap dipisah agar chat dan game dapat berkembang atau dipecah menjadi worker terpisah di kemudian hari.

Untuk ratusan koneksi aktif, aplikasi realtime dapat berjalan pada satu instance lebih dahulu. Redis menyediakan pub/sub dan Socket.IO adapter agar horizontally scaling tidak mengubah kontrak aplikasi.

## Arsitektur Tingkat Tinggi

```text
Browser
  ├── Next.js Web UI
  │     ├── Auth/session pages
  │     ├── Chat UI
  │     ├── Lobby UI
  │     └── Phaser 3 game canvas
  │
  └── HTTPS + Socket.IO
          │
      NestJS/Fastify
      ├── Auth module
      ├── Users module
      ├── Chat module
      ├── Game module
      └── Realtime gateway
          │
      ┌─────┴────────┐
      │              │
 PostgreSQL        Redis
 data permanen     presence, room state,
                   rate limit, pub/sub
```

## Struktur Folder yang Direncanakan

```text
apps/
  web/
    app/
      (auth)/
      (chat)/
      (game)/
    components/
    features/
      auth/
      chat/
      game/
    lib/
  realtime/
    src/
      auth/
      users/
      chat/
      game/
      realtime/
      common/
      config/
    prisma/
packages/
  contracts/
    src/
```

Pada backend, controller hanya menangani routing, validasi awal, dan pemanggilan service. Service berisi use case. Repository menjadi satu-satunya layer yang melakukan query Prisma ke database.

## Skema Database

### Tabel: `users`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key dan userId permanen |
| `email` | CITEXT | Unik, normalisasi huruf kecil |
| `username` | CITEXT | Unik untuk pencarian dan mention |
| `display_name` | VARCHAR | Nama yang ditampilkan |
| `password_hash` | TEXT | Hash Argon2id, tidak pernah dikembalikan ke client |
| `avatar_url` | TEXT NULL | URL avatar atau asset internal |
| `email_verified_at` | TIMESTAMP NULL | Waktu verifikasi email |
| `last_seen_at` | TIMESTAMP NULL | Diperbarui berdasarkan presence |
| `created_at` | TIMESTAMP | Waktu pembuatan akun |
| `updated_at` | TIMESTAMP | Waktu perubahan akun |

### Tabel: `auth_tokens`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Relasi ke `users` |
| `type` | ENUM | `email_verification` atau `password_reset` |
| `token_hash` | TEXT | Hash token, bukan token mentah |
| `expires_at` | TIMESTAMP | Kedaluwarsa token |
| `used_at` | TIMESTAMP NULL | Menandai token sudah dipakai |
| `created_at` | TIMESTAMP | Waktu pembuatan token |

### Tabel: `conversations`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `type` | ENUM | `private` atau `public` |
| `name` | VARCHAR NULL | Wajib untuk public room, kosong untuk private chat |
| `description` | TEXT NULL | Deskripsi public room |
| `owner_id` | UUID NULL | Pembuat room atau owner private chat |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `updated_at` | TIMESTAMP | Waktu perubahan room |

### Tabel: `conversation_members`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `conversation_id` | UUID | Relasi ke `conversations` |
| `user_id` | UUID | Relasi ke `users` |
| `role` | ENUM | `owner`, `moderator`, atau `member` |
| `joined_at` | TIMESTAMP | Waktu bergabung |
| `last_read_message_id` | UUID NULL | Menandai progress pembacaan pesan |

Constraint unik memastikan satu user hanya memiliki satu membership per conversation.

### Tabel: `messages`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `conversation_id` | UUID | Relasi ke `conversations` |
| `sender_id` | UUID | Relasi ke `users` |
| `client_message_id` | UUID | Idempotency key dari client |
| `body` | TEXT | Isi pesan tervalidasi dan dibatasi |
| `kind` | ENUM | `text` atau `system` |
| `created_at` | TIMESTAMP | Waktu server menerima pesan |
| `edited_at` | TIMESTAMP NULL | Waktu edit, jika diaktifkan |
| `deleted_at` | TIMESTAMP NULL | Soft delete, jika diperlukan |

Index utama: `(conversation_id, created_at, id)` untuk pagination riwayat pesan.

### Tabel: `game_rooms`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `code` | VARCHAR UNIQUE | Kode invite yang singkat dan tidak mudah ditebak |
| `host_id` | UUID | Relasi ke `users` |
| `status` | ENUM | `waiting`, `countdown`, `playing`, `finished`, atau `closed` |
| `max_players` | SMALLINT | Default 4, maksimum 4 |
| `round_duration_seconds` | SMALLINT | Default 90 |
| `created_at` | TIMESTAMP | Waktu pembuatan room |
| `updated_at` | TIMESTAMP | Perubahan status |
| `finished_at` | TIMESTAMP NULL | Waktu round terakhir selesai |

### Tabel: `game_participants`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `game_room_id` | UUID | Relasi ke `game_rooms` |
| `user_id` | UUID | Relasi ke `users` |
| `ready` | BOOLEAN | Status ready check |
| `status` | ENUM | `active`, `left`, atau `disconnected` |
| `joined_at` | TIMESTAMP | Waktu masuk room |
| `last_seen_at` | TIMESTAMP | Waktu heartbeat terakhir |

Constraint unik: satu user hanya dapat menjadi peserta satu kali pada satu game room.

### Tabel: `game_matches`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `game_room_id` | UUID | Relasi ke `game_rooms` |
| `status` | ENUM | `active`, `finished`, atau `aborted` |
| `started_at` | TIMESTAMP NULL | Waktu mulai |
| `ended_at` | TIMESTAMP NULL | Waktu selesai |
| `seed` | TEXT NULL | Seed untuk reproduksi dan validasi internal |
| `duration_ms` | INTEGER NULL | Durasi efektif round |

### Tabel: `game_results`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `match_id` | UUID | Relasi ke `game_matches` |
| `user_id` | UUID | Relasi ke `users` |
| `score` | INTEGER | Skor final yang dihitung server |
| `rank` | SMALLINT | Peringkat akhir |
| `tokens_collected` | INTEGER | Token yang dikumpulkan |
| `survival_time_ms` | INTEGER | Lama bertahan |

Constraint unik: satu hasil per user per match.

## Model Realtime Chat

WebSocket namespace `/chat` menggunakan session cookie yang sudah terautentikasi. Setiap event membawa `conversationId`, payload minimal, dan `clientMessageId` untuk pesan yang perlu idempotensi.

### Event client ke server

| Event | Fungsi |
|---|---|
| `conversation.join` | Memverifikasi akses dan membuat subscription room setelah authorization |
| `message.send` | Mengirim pesan privat atau public room |
| `typing.start` | Menandai user mulai mengetik |
| `typing.stop` | Menghentikan indikator mengetik |
| `message.read` | Memperbarui posisi read receipt |

### Event server ke client

| Event | Fungsi |
|---|---|
| `conversation.presence` | Mengirim status online/offline |
| `message.created` | Mengirim pesan yang sudah tersimpan |
| `typing.updated` | Mengirim status mengetik anggota room |
| `message.read` | Mengirim progress read receipt |
| `chat.error` | Mengirim error yang aman dan dapat ditindaklanjuti |

Server menyimpan pesan ke PostgreSQL terlebih dahulu, lalu menerbitkan event ke room. Duplikasi `clientMessageId` tidak boleh membuat pesan tersimpan dua kali.

## Model Realtime Game

WebSocket namespace `/game` berdiri sendiri dari chat. Semua state movement, collision, token, hazard, waktu, dan skor dihitung oleh server. Client hanya mengirim intent movement dan melakukan interpolasi visual.

- Tick server stateless sementara dapatemian hingga 15 Hz untuk MVP.
- Input memiliki sequence number dan timestamp untuk membantu reconnect.
- Server membatasi input frequency, coordinate delta, dan movement direction.
- Client tidak boleh mengirim skor, waktu remaining, atau collision result.
- State awal dikirim sebagai snapshot; MVP boleh mengirim snapshot penuh dengan optimasi delta pada tahap berikutnya.
- Heartbeat dan reconnect token mencegah reconnect tanpa batas mengambil alih sesi orang lain.
- Setelah round selesai, hasil disimpan ke PostgreSQL; state sementara room dibersihkan setelah masa retensi.

### Event client ke server

| Event | Fungsi |
|---|---|
| `game.room.join` | Bergabung dengan kode/invite room |
| `game.player.ready` | Mengubah status ready |
| `game.input` | Mengirim intent movement |
| `game.rematch.request` | Meminta round berikutnya |
| `game.leave` | Meninggalkan room secara eksplisit |

### Event server ke client

| Event | Fungsi |
|---|---|
| `game.room.snapshot` | Mengirim state lobby/arena |
| `game.player.joined` | Menginformasikan peserta baru |
| `game.player.updated` | Mengirim perubahan ready/presence |
| `game.countdown` | Mengirim hitung mundur |
| `game.state` | Mengirim snapshot arena |
| `game.round.finished` | Mengirim leaderboard dan hasil |
| `game.error` | Mengirim error room/game |

## Daftar Endpoint/Rute REST

| Method | Path | Fungsi | Auth diperlukan? |
|---|---|---|---|
| POST | `/api/auth/register` | Membuat akun dan mengirim verifikasi | Tidak |
| POST | `/api/auth/verify-email` | Memverifikasi email | Tidak |
| POST | `/api/auth/resend-verification` | Mengirim ulang verifikasi | Tidak |
| POST | `/api/auth/login` | Membuat session | Tidak |
| POST | `/api/auth/logout` | Menghapus session | Ya |
| POST | `/api/auth/forgot-password` | Meminta reset password | Tidak |
| POST | `/api/auth/reset-password` | Mengubah password dengan token | Tidak |
| GET | `/api/auth/me` | Mengambil user aktif | Ya |
| PATCH | `/api/users/me` | Mengubah display name/avatar | Ya |
| GET | `/api/users/:username` | Melihat profil publik | Ya |
| GET | `/api/conversations` | Meng daftar chat user | Ya |
| POST | `/api/conversations/private` | Membuat atau membuka chat privat | Ya |
| POST | `/api/conversations/public` | Membuat public room | Ya |
| GET | `/api/conversations/:id` | Mengambil detail conversation | Ya |
| GET | `/api/conversations/:id/messages` | Mengambil riwayat pesan dengan cursor | Ya |
| POST | `/api/conversations/:id/members` | Menambahkan anggota pada public room | Ya |
| DELETE | `/api/conversations/:id/members/:userId` | Menghapus anggota atau keluar | Ya |
| POST | `/api/game/rooms` | Membuat game room | Ya |
| GET | `/api/game/rooms` | Mencari/list game room | Ya |
| GET | `/api/game/rooms/:code` | Mengambil detail room | Ya |
| GET | `/api/game/rooms/:code/results` | Mengambil hasil round | Ya |

Endpoint game lobby dan movement tetap melalui WebSocket agar authorization dan state transition berada pada realtime service yang sama.

## Dependency Pihak Ketiga

- `next`, `react`, dan `react-dom` untuk web UI.
- `phaser` untuk rendering dan input game 2D.
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-fastify`, dan `@nestjs/websockets` untuk backend modular.
- `socket.io` dan `socket.io-client` untuk realtime transport.
- `fastify` sebagai HTTP adapter NestJS.
- `prisma` dan `@prisma/client` untuk database access.
- `ioredis` atau client Redis resmi yang dipilih untuk cache dan pub/sub.
- `argon2` atau library native yang telah lulus audit untuk password hashing.
- `zod` untuk validasi payload REST dan WebSocket.
- `pino` atau logger terstruktur untuk request dan realtime event logging.
- `vitest` atau test runner yang mengikuti konvensi monorepo untuk unit dan integration test.

Versi spesifik akan dikunci saat instalasi dan dicatat dalam lockfile. Library tidak ditambahkan tanpa pemeriksaan apakah library tersebut tersedia serta cocok dengan versi runtime yang dipilih.

## Aturan Layer Backend

- **Routing:** mendaftarkan endpoint dan WebSocket message handler.
- **Controller/gateway:** adapter tipis, validasi payload, autentikasi, pemanggilan service, dan format response.
- **Service/use-case:** authorization, aturan chat, lifecycle room, simulasi game, dan transaksi.
- **Repository:** seluruh query Prisma dan pemetaan database.
- **Redis adapter:** presence, rate limit, pub/sub, dan state sementara; bukan pengganti database permanen.
- **Contract:** tipe payload bersama antara web dan realtime service.

## Environment dan Konfigurasi

Environment variable yang diperlukan:

```text
NODE_ENV
DATABASE_URL
REDIS_URL
SESSION_SECRET
APP_ORIGIN
EMAIL_PROVIDER
EMAIL_FROM
EMAIL_API_KEY
PORT
```

Tidak ada credential, API key, atau password yang disimpan dalam source code. Nilai development dan production dipisahkan.

## Keamanan

- Hash password dengan Argon2id dan parameter yang dapat diaudit.
- Gunakan HTTP-only, secure, same-site cookie; jangan menyimpan session token di localStorage.
- Validasi email, username, panjang pesan, nama room, kode room, dan semua payload WebSocket.
- Batasi ukuran request dan event rate per user/IP.
- Gunakan authorization pada setiap conversation, membership, dan game room.
- Batasi CORS dan WebSocket origin hanya ke origin aplikasi yang diizinkan.
- Sanitize output pesan untuk mencegah XSS; body disimpan sebagai plain text pada MVP.
- Jangan mempercayai posisi, skor, waktu, username, atau role dari client.
- Gunakan transaction ketika membuat conversation, membership, message, dan game match yang saling terkait.
- Tambahkan security headers, request ID, audit log untuk moderation, dan health/readiness endpoint.
- Terapkan policy recycle untuk token verifikasi/reset agar token hanya dapat dipakai sekali.

## Deployment

### Development

Docker Compose menjalankan PostgreSQL, Redis, realtime service, dan web service. Migrate database dijalankan sebagai langkah eksplisit, bukan otomatis setiap start.

### Production awal

- Next.js dibangun menjadi web service atau artifact yang sesuai dengan platform deployment.
- NestJS/Fastify dijalankan pada container atau VM dengan persistent WebSocket support.
- PostgreSQL dan Redis preferably memakai layanan terkelola atau instance dengan backup.
- TLS digunakan untuk HTTP dan WebSocket.
- Health/readiness endpoint dipakai oleh orchestrator.
- Log, metric connection, event latency, error rate, dan game tick dipantau.

## Testing dan Kualitas

- Unit test untuk aturan game, validasi, dan state transition.
- Integration test untuk repository, auth, conversation membership, dan persistence.
- WebSocket test untuk join, authorization, duplicate message, reconnect, dan invalid input.
- Load test dengan ratusan koneksi WebSocket dan beberapa room aktif.
- Screenshot comparison terhadap referensi visual setelah UI dibuat.
- Security review sebelum release.
- Bug hunt untuk race condition, reconnect, duplicate message, stale state, dan input validation.

## KPIs dan Observability

- Message delivery latency p95.
- WebSocket connection success rate.
- Reconnect success rate.
- Game tick latency dan jumlah input yang ditolak.
- Jumlah message yang gagal disimpan.
- Room game yang selesai dengan state error.
- CPU, memory, Redis, dan database connection utilization.

## Keputusan yang Masih Perlu Dikonfirmasi

- Provider email untuk verifikasi dan reset password.
- Public room: terbuka untuk semua pengguna dengan moderasi dasar atau invite-only.
- Hosting awal: Docker lokal, VPS, atau cloud terkelola.
- Apakah Phaser 3 disetujui untuk game client.
- Referensi visual dan gaya tampilan sebelum styling UI dikerjakan.
- Apakah kontrol sentuh mobile diperlukan pada MVP; recommended untuk web responsif.
