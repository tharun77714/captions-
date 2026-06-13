import cv2
import numpy as np
from PIL import Image

# Load the rendered ASS image
img = cv2.imread("rendered2.png")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Threshold to get text pixels
_, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)

# Find contours of individual letters
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

boxes = [cv2.boundingRect(c) for c in contours]
# Filter out tiny noise
boxes = [b for b in boxes if b[2] > 2 and b[3] > 2]

# Sort boxes top-to-bottom, then left-to-right
boxes.sort(key=lambda b: (b[1] // 20, b[0]))

if not boxes:
    print("No text found")
    exit()

# We know the text is:
# పాపం బేసిక్కా బేసిక్కా
# బేసిక్కా బాగి పాపం
# చేస్కున్నా అనుకునాడు

# Let's find the word gap between the first and second word
# Words are separated by a space. The distance between characters in a word is small.
# The distance between words is larger.
gaps = []
for i in range(len(boxes) - 1):
    x1, y1, w1, h1 = boxes[i]
    x2, y2, w2, h2 = boxes[i+1]
    
    # If on same line roughly
    if abs(y1 - y2) < 20:
        gap = x2 - (x1 + w1)
        gaps.append(gap)

gaps.sort()
# In Telugu, character gaps might be 1-4 pixels. Word gaps (spaces) will be the largest.
# Let's take the max gap on a single line as the word gap.
word_gap = max(gaps) if gaps else -1

# Line spacing
lines = []
current_line = []
for b in boxes:
    if not current_line:
        current_line.append(b)
    else:
        # Check if same line
        if abs(b[1] - current_line[-1][1]) < 20:
            current_line.append(b)
        else:
            lines.append(current_line)
            current_line = [b]
if current_line:
    lines.append(current_line)

line_spacing = -1
if len(lines) >= 2:
    # Baseline of line 1 vs line 2
    # Approximate baseline by the max(y+h) of the line, or just average y
    y1 = min([b[1] for b in lines[0]])
    y2 = min([b[1] for b in lines[1]])
    line_spacing = y2 - y1

print(f"wordGapAss: {word_gap}")
print(f"lineSpacingAss: {line_spacing}")
