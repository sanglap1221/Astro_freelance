import sys

def inspect():
    path = r"d:\My Projects\Astro_FreeLance\backend\app\pdf\templates\bengali_report.html"
    with open(path, "rb") as f:
        data = f.read()
    
    print(f"File size: {len(data)} bytes")
    
    try:
        data.decode('utf-8')
        print("Successfully decoded as UTF-8!")
    except UnicodeDecodeError as e:
        print(f"UTF-8 decode failed: {e}")
        start = max(0, e.start - 50)
        end = min(len(data), e.end + 50)
        print(f"Context bytes around error: {data[start:end]}")
        
    for enc in ['utf-8-sig', 'utf-16', 'windows-1252', 'iso-8859-1', 'gb18030', 'utf-8-sig']:
        try:
            data.decode(enc)
            print(f"Successfully decoded as {enc}!")
        except Exception:
            pass

if __name__ == '__main__':
    inspect()
