import pathlib,zipfile,xml.etree.ElementTree as E,posixpath
src=pathlib.Path('C:/Users/aceka/Downloads/MY_NEXT_월드이벤트_전체화면_260903.pptx')
dest=pathlib.Path(__file__).resolve().parents[1]/'public/assets/world-events'
dest.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(src) as z:
    for slide in range(2,18):
        rels=E.fromstring(z.read(f'ppt/slides/_rels/slide{slide}.xml.rels'))
        image=next(r.attrib['Target'] for r in rels if r.attrib['Type'].endswith('/image'))
        path=posixpath.normpath('ppt/slides/'+image)
        (dest/f'world-{slide-1:02}.png').write_bytes(z.read(path))
print('Extracted 16 original slide images')
