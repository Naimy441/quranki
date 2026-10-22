"""Writes the demo account into the iOS simulator app's AsyncStorage (RCTAsyncLocalStorage_V1).
Usage: python3 seed-ios.py <app data container> <demo-state.json>"""
import hashlib, json, os, sys

container, state_path = sys.argv[1], sys.argv[2]
d = os.path.join(container, 'Library/Application Support/com.quranki.app/RCTAsyncLocalStorage_V1')
os.makedirs(d, exist_ok=True)
for f in os.listdir(d):
    os.remove(os.path.join(d, f))
state = json.load(open(state_path))
manifest = {}
for key, value in state.items():
    if len(value) <= 1024:
        manifest[key] = value
    else:
        with open(os.path.join(d, hashlib.md5(key.encode()).hexdigest()), 'w') as fh:
            fh.write(value)
        manifest[key] = None
json.dump(manifest, open(os.path.join(d, 'manifest.json'), 'w'))
print('wrote', len(state), 'keys')
