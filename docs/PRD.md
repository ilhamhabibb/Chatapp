# PRD: Web Chat & Arena Skor

## Latar Belakang
Web chatting ini ingin menyediakan satu tempat untuk pengguna berkomunikasi secara real-time dan bermain game ringan bersama maksimal empat pengguna. Setiap pengguna memiliki identitas permanen agar percakapan, profil, dan hasil permainan dapat dikaitkan dengan akun yang sama.

Sasaran awal adalah membangun MVP web responsif yang mudah dikembangkan, bukan aplikasi sosial besar dengan seluruh fitur komunikasi. Fokus pertama adalah chat privat, public room, dan game Arena Skor yang dapat dimainkan 2–4 orang.

## Target Pengguna
- Pengguna yang ingin bercakapan dengan satu orang tanpa membuat aplikasi khusus.
- Kelompok kecil yang ingin masuk ke public room berdasarkan nama atau topik.
- Teman yang ingin bermain game ringan secara real-time.
- Pengguna desktop maupun mobile melalui browser.

## Skenario Utama
1. Pengguna mendaftar, memverifikasi email, lalu login.
2. Pengguna melihat profil dengan UUID `userId` dan username.
3. Pengguna membuat atau membuka chat privat dengan user lain.
4. Pengguna membuat atau bergabung ke public room.
5. Pengguna membuat game room atau bergabung menggunakan link/kode room.
6. Pemain masuk ke lobby, melakukan ready check, lalu memulai Arena Skor.
7. Selama permainan, pemain bergerak, mengumpulkan token, menghindari hazard, dan melihat skor.
8. Round selesai, hasil ditampilkan, dan pemain dapat mengulang round.

## Fitur

### Must-have (MVP)
- [ ] Registrasi dan login menggunakan email serta password.
- [ ] UUID `userId` permanen untuk setiap user.
- [ ] Username, nama tampilan, dan avatar sederhana.
- [ ] Verifikasi email dan pemulihan password.
- [ ] Logout serta invalidasi session.
- [ ] Chat privat real-time antara dua pengguna.
- [ ] Public room real-time yang dapat dibuat, dicari, dan dimasuki.
- [ ] Riwayat pesan dengan pagination.
- [ ] Status online/offline dan last seen.
- [ ] Typing indicator.
- [ ] Menandai pesan sebagai sudah dibaca.
- [ ] Game Arena Skor untuk 2–4 pemain.
- [ ] Game room dengan kode/invite link.
- [ ] Lobby, ready check, dan mulai game.
- [ ] Arena 2D dengan movement, token, hazard, collision, dan skor.
- [ ] Round 90 detik, leaderboard, hasil akhir, dan rematch.
- [ ] Reconnect tanpa kehilangan session atau akses room.
- [ ] Validasi dan pengecekan input game di server.
- [ ] Moderasi dasar public room.

### Nice-to-have (versi berikutnya)
- [ ] Teman dekat dan read receipt lanjutan.
- [ ] Reaction pada pesan.
- [ ] Upload gambar dan file dengan batas ukuran.
- [ ] Lebih dari satu jenis game.
- [ ] Matchmaking dan pencarian lawan.
- [ ] Leaderboard mingguan.
- [ ] Pencarian penuh dan filter riwayat chat.
- [ ] Voice chat atau video call.
- [ ] Login melalui Google/social provider.
- [ ] Notifikasi browser.
- [ ] Mode spectator.

## Di Luar Cakupan
- Aplikasi native Android/iOS.
- Video call dan voice chat pada MVP.
- End-to-end encryption pada MVP karena server membutuhkan membaca dan memvalidasi event game serta moderasi.
- Game dengan fisika kompleks, PvP ranking, atau ekonomi item pada MVP.
- Mode turn-based pada MVP; satu game pertama diprioritaskan.
- Pembayaran, langganan, dan monetisasi pada MVP.
- Multi-region deployment dan load balancing kompleks pada tahap awal.
- Admin dashboard penuh; moderasi MVP cukup dengan aksi dasar yang terbatas.

## Aturan Game
- Maksimal empat pemain aktif per room.
- Minimal dua pemain untuk memulai round.
- Durasi round 90 detik.
- Pemain adalah sumber input, tetapi server memiliki otoritas atas posisi, collision, token, hazard, waktu, dan skor.
- Round tidak boleh dimulai tanpa persetujuan host dan seluruh pemain siap.
- Room harus memiliki status yang jelas: waiting, playing, finished, atau closed.

## Batasan
- Platform: web responsif untuk browser desktop dan mobile.
- Autentikasi: email dan password; UUID sebagai identitas internal yang ditampilkan secara aman.
- Sesi: HTTP-only secure cookie; token tidak disimpan di localStorage.
- Skala target: ratusan pengguna aktif secara bersamaan pada tahap MVP.
- Game client: browser 2D dengan sinkronisasi state melalui WebSocket.
- State sementara real-time: Redis; pesan dan hasil permanen: PostgreSQL.
- Gaya visual dan referensi tampilan belum ditetapkan; detail UI dilakukan setelah referensi visual disepakati.

## Kriteria Sukses
- Dua pengguna dapat membuat akun, login, dan mengirim pesan satu sama lain melalui chat privat.
- Pesan baru tampil pada client penerima dalam waktu target satu detik pada kondisi normal.
- Pengguna dapat membuat atau masuk public room dan melihat pesan antar-user.
- Dua hingga empat pengguna dapat menyelesaikan satu round Arena Skor tanpa state yang desinkronisasi atau berakhir dengan error.
- Reconnect tidak membuat user kehilangan session, membership, atau lobby state secara permanen.
- Client tidak dapat menetapkan skor atau posisi secara langsung tanpa validasi server.
- Sistem dapat diuji pada beban ratusan koneksi aktif tanpa kehilangan pesan yang sudah berhasil dikirim.
- Tidak ada secret yang tersimpan di source code dan endpoint sensitif memiliki validasi serta rate limit.

## Keputusan yang Menunggu Konfirmasi
- Apakah verifikasi email dan reset password membutuhkan layanan email pada MVP atau ditunda ke tahap kedua.
- Apakah public room terbuka untuk semua pengguna dengan moderasi dasar, atau hanya dapat dibuat melalui undangan.
- Target deployment awal: lokal/Docker, VPS, atau layanan cloud terkelola.
- Nama produk dan referensi visual untuk desain UI.
