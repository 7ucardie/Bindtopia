"""Original vector brand assets and deterministic raster exports.
Requires Pillow and fontTools; not needed for normal catalog updates.
"""
from pathlib import Path
import json, math
from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/brand';OUT.mkdir(parents=True,exist_ok=True)
# An ocean orb: horizon wave + golden sun. Original geometry, not an official franchise mark.
mark='''<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55b8e9"/><stop offset="1" stop-color="#1d8fb6"/></linearGradient><clipPath id="orb"><circle cx="64" cy="64" r="54"/></clipPath></defs><circle cx="64" cy="64" r="58" fill="#082c55"/><g clip-path="url(#orb)"><path d="M0 0H128V128H0Z" fill="url(#sky)"/><path d="M0 68C24 44 40 82 64 65S104 45 128 62V128H0Z" fill="#fff8df"/><path d="M0 68C24 44 40 82 64 65S104 45 128 62" fill="none" stroke="#082c55" stroke-width="8"/><path d="M25 93C40 85 48 102 63 94S86 86 101 93" fill="none" stroke="#40bdb3" stroke-width="6" stroke-linecap="round"/></g><circle cx="64" cy="64" r="18" fill="#082c55"/><circle cx="64" cy="64" r="11" fill="#ffce57"/><circle cx="61" cy="60" r="3" fill="#fff7d5"/>'''
svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Bindtopia ocean orb">'+mark+'</svg>'
(OUT/'bindtopia-mark.svg').write_text(svg)
(ROOT/'dist/icon.svg').write_text(svg)
font=instantiateVariableFont(TTFont(ROOT/'dist/fonts/Roboto-Variable.ttf'),{'wght':750,'wdth':100},inplace=False)
glyphs=font.getGlyphSet();cmap=font.getBestCmap();x=0;paths=[]
for char in 'Bindtopia':
 name=cmap[ord(char)];pen=SVGPathPen(glyphs);glyphs[name].draw(pen);paths.append(f'<path transform="translate({x},0)" d="{pen.getCommands()}"/>');x+=glyphs[name].width-30
scale=82/font['head'].unitsPerEm;total=round(150+x*scale+10)
for name,ink in [('light','#082c55'),('dark','#f4edff')]:
 logo=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} 128" role="img" aria-label="Bindtopia"><g>{mark}</g><g fill="{ink}" transform="translate(148,91) scale({scale},-{scale})">'+''.join(paths)+'</g></svg>'
 (OUT/f'bindtopia-logo-{name}.svg').write_text(logo)
def curve(p0,p1,p2,p3,steps=50):
 pts=[]
 for i in range(steps+1):
  t=i/steps;u=1-t;pts.append((u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]))
 return pts
wave=curve((0,68),(24,44),(40,82),(64,65))+curve((64,65),(88,48),(104,45),(128,62))[1:]
small=curve((25,93),(40,85),(48,102),(63,94))+curve((63,94),(78,86),(86,86),(101,93))[1:]
def raster(size,opaque=False,margin=0):
 s=1024;k=s/128
 im=Image.new('RGBA',(s,s),(242,248,253,255) if opaque else (0,0,0,0));d=ImageDraw.Draw(im)
 def box(a):return tuple(round(v*k) for v in a)
 d.ellipse(box((6,6,122,122)),fill='#082c55')
 inside=Image.new('RGBA',(s,s));g=ImageDraw.Draw(inside)
 for y in range(s):
  t=y/(s-1);a=(85,184,233);b=(29,143,182);color=tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3));g.line([(0,y),(s,y)],fill=color+(255,))
 pts=[(round(a*k),round(b*k)) for a,b in wave];g.polygon(pts+[(s,s),(0,s)],fill='#fff8df');g.line(pts,fill='#082c55',width=round(8*k),joint='curve')
 pts=[(round(a*k),round(b*k)) for a,b in small];g.line(pts,fill='#40bdb3',width=round(6*k),joint='curve')
 for a,b in [small[0],small[-1]]:g.ellipse(box((a-3,b-3,a+3,b+3)),fill='#40bdb3')
 mask=Image.new('L',(s,s));ImageDraw.Draw(mask).ellipse(box((10,10,118,118)),fill=255);im.paste(inside,(0,0),mask)
 d=ImageDraw.Draw(im);d.ellipse(box((46,46,82,82)),fill='#082c55');d.ellipse(box((53,53,75,75)),fill='#ffce57');d.ellipse(box((58,57,64,63)),fill='#fff7d5')
 if margin:
  reduced=im.resize((round(s*(1-margin*2)),)*2,Image.Resampling.LANCZOS);base=Image.new('RGBA',(s,s),'#f2f8fd');base.alpha_composite(reduced,((s-reduced.width)//2,)*2);im=base
 return im.resize((size,size),Image.Resampling.LANCZOS)
for size in [16,32,48,180,192,512,1024]:
 im=raster(size,opaque=size>=180,margin=.06 if size>=180 else 0);im.save(OUT/f'bindtopia-icon-{size}.png')
raster(64).save(ROOT/'dist/favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64)])
raster(180,opaque=True,margin=.06).convert('RGB').save(ROOT/'dist/apple-touch-icon.png')
assets=ROOT/'ios/Bindtopia/Assets.xcassets';icons=assets/'AppIcon.appiconset';icons.mkdir(parents=True,exist_ok=True)
(assets/'Contents.json').write_text(json.dumps({'info':{'author':'xcode','version':1}},indent=2))
raster(1024,opaque=True,margin=.06).convert('RGB').save(icons/'AppIcon.png')
(icons/'Contents.json').write_text(json.dumps({'images':[{'filename':'AppIcon.png','idiom':'universal','platform':'ios','size':'1024x1024'}],'info':{'author':'xcode','version':1}},indent=2))
# Review sheet at several practical sizes.
canvas=Image.new('RGB',(1200,680),'#f2f8fd');d=ImageDraw.Draw(canvas)
for size,pos in [(320,(70,75)),(192,(485,105)),(64,(765,160)),(32,(890,176)),(16,(995,184))]:
 img=raster(size);canvas.paste(img,pos,img)
for size,pos in [(320,(70,385)),(64,(770,500))]:
 # Bottom panel demonstrates the mark on a dark surface.
 pass
d.rectangle((0,390,1200,680),fill='#171221');im=raster(220);canvas.paste(im,(125,425),im);im=raster(64);canvas.paste(im,(500,500),im);im=raster(32);canvas.paste(im,(680,516),im);im=raster(16);canvas.paste(im,(820,524),im)
canvas.save(OUT/'brand-preview.png')
print('Original vector mark, outlined wordmarks, favicons and iPhone AppIcon created.')
