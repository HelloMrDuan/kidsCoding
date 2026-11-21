"""Create the unfinished Golden meteor project using the original lesson assets."""

from pathlib import Path
from tempfile import TemporaryDirectory
import json
import zipfile

from build_scratch_project import build_sb3

DESTINATION = (
    Path(__file__).resolve().parents[3]
    / 'apps/web/public/scratch-samples/g3-u1-l02-golden-starter.sb3'
)


def build_golden() -> None:
    with TemporaryDirectory() as temp:
        source = build_sb3(Path(temp) / 'source.sb3')
        with zipfile.ZipFile(source) as archive:
            project = json.loads(archive.read('project.json'))
            meteor = next(target for target in project['targets'] if target['name'] == '流星')
            blocks = meteor['blocks']
            blocks['repeat']['inputs']['TIMES'][1][1] = '6'
            meteor['visible'] = False
            blocks['flag']['next'] = 'repeat'
            blocks['repeat']['parent'] = 'flag'
            del blocks['hide']
            # Keep both entry scripts in view without horizontal panning on touch screens.
            blocks['clone_flag']['x'] = blocks['flag']['x']
            blocks['clone_flag']['y'] = 340
            blocks['down']['next'] = None
            del blocks['delete']
            with zipfile.ZipFile(DESTINATION, 'w', compression=zipfile.ZIP_DEFLATED) as output:
                output.writestr('project.json', json.dumps(project, ensure_ascii=False))
                for name in archive.namelist():
                    if name != 'project.json':
                        output.writestr(name, archive.read(name))


if __name__ == '__main__':
    build_golden()
