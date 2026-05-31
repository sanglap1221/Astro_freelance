import runpy
import os

scripts = [
    'validate_1941.py',
    'validate_1951.py',
    'validate_1961.py',
    'validate_1971.py',
    'validate_1981.py',
    'validate_1991.py',
    'validate_2001.py',
]

for s in scripts:
    path = os.path.join(os.path.dirname(__file__), s)
    print('\n' + '='*60)
    print('Running', s)
    try:
        runpy.run_path(path, run_name='__main__')
    except Exception as e:
        print('Error running', s, e)

print('\nDone.')
