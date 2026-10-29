import sys, zipfile, struct
src, dst = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(src)
with open(dst, "wb") as f:
    zout = zipfile.ZipFile(f, "w")
    for info in zin.infolist():
        data = zin.read(info.filename)
        ni = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        ni.compress_type = info.compress_type
        ni.external_attr = info.external_attr
        ni.create_system = 0
        ni.extra = b""
        if ni.compress_type == zipfile.ZIP_STORED:
            align = 4096 if info.filename.endswith(".so") else 4
            off = f.tell() + 30 + len(ni.filename.encode("utf-8"))
            # Android zipalign-style extra field (ID 0xD935): 2 bytes alignment + padding
            need = (align - ((off + 6) % align)) % align
            ni.extra = struct.pack("<HHH", 0xD935, 2 + need, align) + b"\x00" * need
        zout.writestr(ni, data)
    zout.close()
z = zipfile.ZipFile(dst)
for i in z.infolist():
    if i.compress_type == zipfile.ZIP_STORED:
        with open(dst, "rb") as f:
            f.seek(i.header_offset); h = f.read(30)
            n, e = struct.unpack("<HH", h[26:30])
            dataoff = i.header_offset + 30 + n + e
        print(i.filename, "data offset", dataoff, "aligned" if dataoff % 4 == 0 else "NOT ALIGNED")
