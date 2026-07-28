# Model 3D Produk Toko Listrik

File di folder ini dipakai AR Viewer (`/models/...`).

## Mapping aset → kategori / produk

| File | Dipakai untuk |
|------|----------------|
| `mcb.glb` | MCB Schneider (1 phase), Panel 12G |
| `modular_circuit_breaker_mcb.glb` | MCB Broco / 3 phase, Kabel, Panel 6G |
| `light_switch.glb` | Saklar 2G/Schneider, Fitting E27/GU10, Lampu 10W |
| `light_switch_3d.glb` | Saklar 1G/3G, Fitting gantung/tempel, Lampu 20W |
| `power_socket.glb` | Stop Kontak 2 lubang, Steker T |
| `uk_double_power_socket.glb` | Stop Kontak 3 lubang, Steker multi |
| `ac_socket.glb` | Stop Kontak outdoor, Steker arde/biasa |
| `RobotExpressive.glb` | Aksesoris (placeholder) |
| `Astronaut.glb` / `NeilArmstrong.glb` | Demo lama (opsional) |

## Catatan
- Nama file **jangan pakai spasi** (pakai underscore).
- Produk yang belum punya model khusus pakai model kategori terdekat.
- Tambah aset baru → taruh di folder ini + set `model_3d_url` di `src/data/products.js`.
