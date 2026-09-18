"""Extract original personal-event page text and render the visible PDF front layer."""
import pathlib,json,fitz
source=next(pathlib.Path('C:/코딩/mylife').glob('03_*.pdf'))
doc=fitz.open(source)
dest=pathlib.Path(__file__).resolve().parents[1]/'public/assets/personal-events'
dest.mkdir(parents=True,exist_ok=True)
records=[]
for page in range(17,49):
    p=doc[page-1]
    p.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).save(dest/f'event-{page}.jpg',jpg_quality=85)
    records.append({'page':page,'source':source.name,'originalText':p.get_text().strip()})
print(json.dumps(records,ensure_ascii=False))
