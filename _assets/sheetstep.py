# -*- coding: utf-8 -*-
import glob, os, sys
from PIL import Image, ImageDraw
d = sys.argv[1]; tag = sys.argv[2]
files = sorted(glob.glob(d + '/*.jpg'))
CELL, COLS, PER = 250, 9, 27
sheets = [files[i:i+PER] for i in range(0, len(files), PER)]
for si, ch in enumerate(sheets):
    rows = (len(ch)+COLS-1)//COLS
    sh = Image.new('RGB', (COLS*CELL, rows*(CELL+18)), (235,235,235))
    dr = ImageDraw.Draw(sh)
    for i, f in enumerate(ch):
        im = Image.open(f); im.thumbnail((CELL-6, CELL-6))
        cx, cy = (i%COLS)*CELL, (i//COLS)*(CELL+18)
        sh.paste(im, (cx+(CELL-im.size[0])//2, cy+(CELL-im.size[1])//2))
        dr.text((cx+4, cy+CELL+3), '%d %s' % (si*PER+i+1, os.path.basename(f)[17:25]), fill=(0,0,0))
    out = '%s_%d.jpg' % (tag, si+1); sh.save(out, quality=88); print('wrote', out)
