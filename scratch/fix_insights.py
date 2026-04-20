import os

path = r'd:\Productivity\StudyTracker\js\insights.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'Click <strong>"Generate AI Insights"</strong> to get personalized study feedback & \nanalysis for this date.'
replacement = 'AI Analysis and study feedback will be provided soon by the developer or administrator.'

new_content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
