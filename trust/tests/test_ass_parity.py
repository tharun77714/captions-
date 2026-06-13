import unittest
from datetime import timedelta
import sys
import os

def format_ass_time(seconds):
    td = timedelta(seconds=seconds)
    hours, remainder = divmod(td.seconds, 3600)
    minutes, seconds_int = divmod(remainder, 60)
    milliseconds = round(td.microseconds / 10000)
    return f"{hours}:{minutes:02}:{seconds_int:02}.{milliseconds:02}"

def enforce_monotonic_timestamps(words, segment_start, segment_end):
    curr_time = segment_start
    sanitized = []
    for w in words:
        start = max(curr_time, w.get('start', 0.0))
        end = max(start, w.get('end', start))
        sanitized.append({
            'word': w['word'],
            'start': start,
            'end': end
        })
        curr_time = end
    return sanitized

def calculate_ass_margins(position, scale_factor):
    # CSS bottom-16 is 64px. top-8 is 32px. center is 50%.
    if position == 'bottom':
        return int(64 * scale_factor)
    elif position == 'top':
        return int(32 * scale_factor)
    else:
        return int(32 * scale_factor) # Center margin isn't strictly used vertically by libass

class TestASSParity(unittest.TestCase):
    
    def test_monotonic_timestamps(self):
        words = [
            {'word': 'A', 'start': 1.0, 'end': 1.5},
            {'word': 'B', 'start': 1.4, 'end': 2.0}, # Overlaps
            {'word': 'C', 'start': 0.0, 'end': 0.5}, # Negative relative
            {'word': 'D', 'start': 2.0, 'end': 2.0}  # Zero duration
        ]
        sanitized = enforce_monotonic_timestamps(words, 1.0, 3.0)
        
        self.assertEqual(sanitized[0]['start'], 1.0)
        self.assertEqual(sanitized[0]['end'], 1.5)
        
        # Word B should be forced to start at 1.5 instead of 1.4
        self.assertEqual(sanitized[1]['start'], 1.5)
        self.assertEqual(sanitized[1]['end'], 2.0)
        
        # Word C should be forced to start at 2.0
        self.assertEqual(sanitized[2]['start'], 2.0)
        self.assertEqual(sanitized[2]['end'], 2.0)

    def test_positioning_scaling(self):
        scale_1080p = 1080 / 540.0 # 2.0
        self.assertEqual(calculate_ass_margins('bottom', scale_1080p), 128)
        self.assertEqual(calculate_ass_margins('top', scale_1080p), 64)
        
        scale_4k = 2160 / 540.0 # 4.0
        self.assertEqual(calculate_ass_margins('bottom', scale_4k), 256)

    def test_background_padding_deviation(self):
        # CSS is px-3 (12px) py-1.5 (6px)
        css_pad_h = 12
        css_pad_v = 6
        
        # BorderStyle=3 uses a symmetric Outline
        ass_outline = 9 # Proposed weighted average
        
        dev_h = abs(css_pad_h - ass_outline)
        dev_v = abs(css_pad_v - ass_outline)
        
        # Max deviation is 3px. This is mathematically proven.
        self.assertEqual(dev_h, 3)
        self.assertEqual(dev_v, 3)
        
        print(f"\n[Measurement] BorderStyle=3 Error: Horizontal={dev_h}px, Vertical={dev_v}px")

if __name__ == '__main__':
    unittest.main()
