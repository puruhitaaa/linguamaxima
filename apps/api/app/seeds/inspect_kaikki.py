import urllib.request
import gzip
import json

url = "https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl.gz"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

with urllib.request.urlopen(req) as resp:
    with gzip.GzipFile(fileobj=resp) as gz:
        count = 0
        for line in gz:
            if not line.strip():
                continue
            data = json.loads(line)
            # Only main entries
            senses = data.get("senses", [])
            glosses = [g for s in senses for g in s.get("glosses", [])]
            if not glosses:
                continue

            sounds = data.get("sounds", [])
            ipa = None
            for s in sounds:
                if "ipa" in s:
                    ipa = s["ipa"]
                    break

            print(f"[{count+1}] Word: {data.get('word')}, POS: {data.get('pos')}, IPA: {ipa}")
            print(f"    Glosses: {glosses[:2]}")
            count += 1
            if count >= 8:
                break
