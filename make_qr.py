import sys
from pathlib import Path
import qrcode
import qrcode.image.svg
base=(sys.argv[1] if len(sys.argv)>1 else 'https://birliklezzetleri.netlify.app').rstrip('/')
assert base.startswith('https://'), 'HTTPS adresi gerekli'
folder=Path(__file__).parent/'public'/'qr'
folder.mkdir(parents=True,exist_ok=True)
for n in range(1,21):
    qrcode.make(f'{base}/?masa={n}',image_factory=qrcode.image.svg.SvgPathImage,box_size=10,border=4).save(folder/f'masa-{n}.svg')
