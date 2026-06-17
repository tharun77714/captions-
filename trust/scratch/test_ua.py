import urllib.request
import urllib.parse
import re

font_name = "Montserrat"
user_agents = {
    "safari_old": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.54.16 (KHTML, like Gecko) Version/5.1.4 Safari/534.54.16",
    "ie8": "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)",
    "ie6": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)",
    "android_old": "Mozilla/5.0 (Linux; U; Android 2.2; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
    "curl": "curl/7.68.0",
    "none": ""
}

for name, ua in user_agents.items():
    print(f"--- Testing {name} ---")
    url = f"https://fonts.googleapis.com/css2?family={urllib.parse.quote(font_name)}:wght@400;700&display=swap"
    req = urllib.request.Request(url)
    if ua:
        req.add_header('User-Agent', ua)
    try:
        with urllib.request.urlopen(req) as response:
            css = response.read().decode('utf-8')
            # Print the first url match
            match = re.search(r"src:\s*url\((https://[^)]+)\)", css)
            if match:
                print(f"URL: {match.group(1)}")
            else:
                print("No URL found in CSS")
    except Exception as e:
        print(f"Error: {e}")
