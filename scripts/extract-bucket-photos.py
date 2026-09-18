"""Render the photo region of each supplied bucket PDF page for web cards."""
import pathlib
import fitz

source = pathlib.Path('C:/코딩/mylife')
target = pathlib.Path(__file__).resolve().parents[1] / 'public/assets/buckets'
target.mkdir(parents=True, exist_ok=True)
for group, path in enumerate(sorted(source.glob('*버킷*.pdf')), 1):
    document = fitz.open(path)
    for index, page in enumerate(document, 1):
        # Card photo begins below the title and ends above the cost footer.
        pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=fitz.Rect(16, 82, 171, 174), alpha=False)
        pix.save(target / f'bucket-{group}-{index:03}.jpg', jpg_quality=86)
    print(f'{path.name}: {len(document)} photos')
