import os

def slice_css():
    with open('style.css', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    def get_lines(start, end):
        return ''.join(lines[start:end])

    files = [
        ('css/variables.css', 0, 47),
        ('css/base.css', 47, 402),
        ('css/dashboard.css', 402, 681),
        ('css/components.css', 681, 1145),
        ('css/insights.css', 1145, 1600),
        ('css/tablet.css', 1600, 2019),
        ('css/profile.css', 2019, 2288),
        ('css/modals.css', 2288, 2756),
        ('css/pomodoro.css', 2756, 3102),
        ('css/auth.css', 3102, 3208),
        ('css/layout.css', 3208, 3741),
        ('css/overrides.css', 3741, len(lines))
    ]

    os.makedirs('css', exist_ok=True)

    for fname, start, end in files:
        with open(fname, 'w', encoding='utf-8') as f:
            f.write(get_lines(start, end))

    print("Success: style.css split effectively.")

if __name__ == '__main__':
    slice_css()
