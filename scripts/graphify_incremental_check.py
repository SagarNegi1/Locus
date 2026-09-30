import json
from pathlib import Path
from graphify.detect import detect_incremental

p = Path('.')
result = detect_incremental(p)
Path('.graphify_incremental.json').write_text(json.dumps(result, indent=2))
print('Wrote .graphify_incremental.json')
code_exts = {'.py','.ts','.js','.go','.rs','.java','.cpp','.c','.rb','.swift','.kt','.cs','.scala','.php','.cc','.cxx','.hpp','.h','.kts','.mjs','.cjsx','.tsx','.jsx'}
new_files = result.get('new_files', {})
all_changed = [f for files in new_files.values() for f in files]
code_only = all(Path(f).suffix.lower() in code_exts for f in all_changed)
print('code_only:', code_only)
print('new_total:', result.get('new_total'))
print('total_files:', result.get('total_files'))
