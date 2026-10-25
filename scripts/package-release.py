"""Deterministic archives; excludes Git history, hosting identity, secrets and prior archives."""
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1]
def archive(target,entries):
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
  for src,name in sorted(entries,key=lambda e:e[1]):
   info=zipfile.ZipInfo(name,date_time=(2020,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,src.read_bytes())
allowed=['docs','assets','SPEC.md','REVIEW.md','CLAUDE.md','AGENTS.md','.agents/skills/bindtopia-design','dist','ios','scripts','.github','LICENSE','README.md','HOSTING.md','THIRD_PARTY_NOTICES.md','CONTRIBUTING.md','SECURITY.md','.gitignore','project.config.json','package.json','package-lock.json','playwright.config.mjs','renovate.json','tests']
entries=[]
for name in allowed:
 p=ROOT/name
 for f in ([p] if p.is_file() else p.rglob('*')):
  if f.is_file() and f.suffix not in ('.zip','.tmp') and '__pycache__' not in f.parts:entries.append((f,'bindtopia/'+f.relative_to(ROOT).as_posix()))
archive(ROOT/'dist/bindtopia-source.zip',entries)
print('Broncodearchief samengesteld.')
# Keep download URLs from earlier shared versions working.
from shutil import copyfile
copyfile(ROOT/'dist/bindtopia-source.zip',ROOT/'dist/kaartkompas-source.zip')
