import urllib.request
import urllib.parse
import re

font_name = "Montserrat"
url = f"https://fonts.googleapis.com/css2?family={urllib.parse.quote(font_name)}:wght@300;400;500;600;700;800;900&display=swap"
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as response:
        css = response.read().decode('utf-8')
        
    weights = [300, 400, 500, 600, 700, 800, 900]
    for w in weights:
        pattern = f"font-weight:\s*{w};.*?src:\s*url\((https://[^)]+)\)"
        match = re.search(pattern, css, re.DOTALL | re.IGNORECASE)
        if match:
            print(f"Weight {w}: {match.group(1)}")
        else:
            print(f"Weight {w}: Not found")
except Exception as e:
    print(f"Error: {e}")
