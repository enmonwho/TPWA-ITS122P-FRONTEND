import re
import json

with open('C:\\Users\\rayaj\\.gemini\\antigravity-ide\\brain\\7048a386-c48a-44d8-80df-8968de766852\\.system_generated\\steps\\363\\output.txt', 'r', encoding='utf-8') as f:
    lines = f.read()

print('--- TEXT NODES ---')
for match in re.finditer(r'\[TEXT\] "(.*?)" .*? characters="(.*?)"', lines):
    print(f"Text: {match.group(2)}")
    
print('--- COLORS ---')
for match in set(re.findall(r'color=\{.*?rgba\([^)]+\)', lines)):
    print(match)

print('\n--- FONTS ---')
for match in set(re.findall(r'fontFamily="[^"]+".*?fontWeight=\d+', lines)):
    print(match)
for match in set(re.findall(r'fontSize=\d+', lines)):
    print(match)

print('\n--- DIMENSIONS ---')
for match in set(re.findall(r'"dimensions":\{"width":\d+(?:\.\d+)?,"height":\d+(?:\.\d+)?\}', lines)):
    print(match)
