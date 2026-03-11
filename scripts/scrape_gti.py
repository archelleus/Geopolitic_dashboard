import urllib.request
import json
import re
import html
import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://en.wikipedia.org/w/api.php?action=parse&page=Global_Terrorism_Index&prop=text&format=json"
req = urllib.request.Request(url, headers={"User-Agent": "GeopoliticsDashboard/1.0"})
with urllib.request.urlopen(req, context=ctx) as response:
    data = json.loads(response.read().decode())
    text = data["parse"]["text"]["*"]
    rows = re.findall(r"<tr>(.*?)</tr>", text, re.DOTALL | re.IGNORECASE)
    
    country_scores = {}
    for r in rows:
        tds = re.findall(r"<(?:td|th)[^>]*>(.*?)</(?:td|th)>", r, re.DOTALL | re.IGNORECASE)
        texts = [re.sub(r"<[^>]+>", "", x).strip() for x in tds]
        
        if len(texts) >= 3 and texts[0].isdigit():
            # Clean up country name from things like &#160; and html entities
            country_clean = html.unescape(texts[1]).replace("&#160;", "").replace("\u00a0", "").strip()
            # The score might be empty if not applicable
            if texts[2].replace('.', '', 1).isdigit():
                score = float(texts[2])
                country_scores[country_clean] = score
            
    with open("../data/gti_proxy.json", "w") as f:
        json.dump(country_scores, f, indent=2)
    print(f"Scraped {len(country_scores)} real terrorism scores from Wikipedia GTI page!")
