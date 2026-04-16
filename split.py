import os

def slice_file():
    with open('script.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    def get_lines(start, end):
        return ''.join(lines[start:end])

    files = {
        'js/config.js': get_lines(0, 121),
        'js/store.js': get_lines(121, 273) + get_lines(691, 757) + get_lines(2202, 2237),
        'js/supabase.js': get_lines(273, 691),
        'js/ui.js': get_lines(757, 1258) + get_lines(2158, 2202) + get_lines(2529, 2605),
        'js/timeTracker.js': get_lines(1258, 2158),
        'js/dashboard.js': get_lines(2237, 2529) + get_lines(2605, 3591),
        'js/insights.js': get_lines(3591, 3807),
        'js/pomodoro.js': get_lines(3807, len(lines))
    }

    # Ensure output dir exists
    os.makedirs('js', exist_ok=True)

    for fname, content in files.items():
        with open(fname, 'w', encoding='utf-8') as f:
            f.write(content)

    print("Success: All files split effectively.")

if __name__ == '__main__':
    slice_file()
