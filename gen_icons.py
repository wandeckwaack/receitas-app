import zlib, struct, math, os

OUT = os.path.dirname(os.path.abspath(__file__))
BG  = (184, 64, 42)     # pepper
ART = (247, 242, 228)   # cream

def in_rrect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    qx = max(x0 + r - x, 0.0, x - (x1 - r))
    qy = max(y0 + r - y, 0.0, y - (y1 - r))
    return qx * qx + qy * qy <= r * r

def in_circle(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def is_art(x, y, s):
    """x, y in 0..1. s scales the artwork around the center (for maskable)."""
    x = (x - 0.5) / s + 0.5
    y = (y - 0.5) / s + 0.5

    # panela: corpo trapezoidal com fundo arredondado
    ytop, ybot = 0.470, 0.790
    if ytop <= y <= ybot:
        t = (y - ytop) / (ybot - ytop)
        half = 0.265 + (0.215 - 0.265) * t
        if t > 0.80:
            u = (t - 0.80) / 0.20
            half *= math.sqrt(max(0.0, 1.0 - u * u))
        if abs(x - 0.5) <= half:
            return True

    # alças
    if in_rrect(x, y, 0.150, 0.500, 0.243, 0.575, 0.030): return True
    if in_rrect(x, y, 0.757, 0.500, 0.850, 0.575, 0.030): return True

    # tampa e pegador
    if in_rrect(x, y, 0.195, 0.395, 0.805, 0.458, 0.028): return True
    if in_circle(x, y, 0.5, 0.372, 0.042): return True

    # vapor
    if in_rrect(x, y, 0.352, 0.205, 0.398, 0.335, 0.023): return True
    if in_rrect(x, y, 0.477, 0.155, 0.523, 0.335, 0.023): return True
    if in_rrect(x, y, 0.602, 0.205, 0.648, 0.335, 0.023): return True

    return False

def render(size, art_scale):
    ss = 2                      # supersampling
    n = size * ss
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            hits = 0
            for sy in range(ss):
                for sx in range(ss):
                    x = (px * ss + sx + 0.5) / n
                    y = (py * ss + sy + 0.5) / n
                    if is_art(x, y, art_scale):
                        hits += 1
            a = hits / (ss * ss)
            row += bytes(int(round(BG[i] + (ART[i] - BG[i]) * a)) for i in range(3))
        rows.append(row)
    return rows

def write_png(path, size, rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("escrito:", os.path.basename(path), os.path.getsize(path), "bytes")

os.makedirs(OUT, exist_ok=True)
write_png(os.path.join(OUT, "icon-512.png"), 512, render(512, 1.00))
write_png(os.path.join(OUT, "icon-512-maskable.png"), 512, render(512, 0.74))
write_png(os.path.join(OUT, "icon-192.png"), 192, render(192, 1.00))
write_png(os.path.join(OUT, "icon-180.png"), 180, render(180, 1.00))
