"""把 @fontsource 的 Noto 切片（每字重 101 片）合并成每字重一个 woff2，供 PDF 构建使用。

原因：Paged.js 面对数百个 @font-face / FontFace 会卡死或把内容排两遍；PDF 读本地文件，
不需要按需下载，所以每个字体只注册一个面。网站仍使用切片版（按需加载，省流量）。

用法（先 node scripts/sync-fonts.mjs）：
    python3 -m venv .venv-fonts && .venv-fonts/bin/pip install fonttools brotli
    .venv-fonts/bin/python scripts/merge-fonts.py
"""
import glob,os,re,sys
from fontTools.ttLib import TTFont
from fontTools import merge
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
BASE=os.path.join(ROOT,'docs/assets/fonts/')+''
OUT=os.path.join(ROOT,'book/fonts/')
os.makedirs(OUT,exist_ok=True)
jobs=[('noto-serif-sc','Noto Serif SC',[400,600,700]),('noto-sans-sc','Noto Sans SC',[400,500,700])]
for pkg,fam,weights in jobs:
    for w in weights:
        files=sorted(glob.glob(f'{BASE}{pkg}/{pkg}-*-{w}-normal.woff2'),key=lambda p:int(re.search(rf'{pkg}-(\d+)-',p).group(1)) if re.search(rf'{pkg}-(\d+)-',p) else 0)
        if not files: print('没找到',pkg,w); continue
        # 先把 woff2 解成 ttf 到临时目录，再合并
        tmp=[]
        for i,f in enumerate(files):
            t=TTFont(f); t.flavor=None; p=f'/tmp/mf_{pkg}_{w}_{i}.ttf'; t.save(p); tmp.append(p)
        m=merge.Merger(); font=m.merge(tmp)
        font.flavor='woff2'; out=f'{OUT}{pkg}-{w}.woff2'; font.save(out)
        for p in tmp: os.remove(p)
        print(f'{pkg} {w}: {len(files)} 片 → {os.path.getsize(out)/1e6:.1f} MB, 字符数 {len(font.getBestCmap())}')
