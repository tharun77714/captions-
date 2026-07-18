import json

with open('parity_test_payloads.json', 'r', encoding='utf-8') as f:
    p = json.load(f)[0]

m = p['measurements']
s = p['style']

print('=== MEASUREMENTS FROM BROWSER ===')
print(f"videoWidth:       {m['videoWidth']}")
print(f"videoHeight:      {m['videoHeight']}")
print(f"containerWidth:   {m['containerWidth']}")
print(f"containerHeight:  {m['containerHeight']}")
print(f"scaleFactor:      {m['scaleFactor']}")
print(f"fontSize (in m):  {m['fontSize']}   <-- ALREADY in native pixels (CSS px * scaleFactor)")
print(f"bottomOffset:     {m['bottomOffset']}  <-- ALREADY in native pixels")
print(f"paddingLeft:      {m['paddingLeft']}")
print(f"paddingTop:       {m['paddingTop']}")
print(f"fontFamily:       {m['fontFamily']}")
print(f"position:         {m.get('position', 'MISSING')}")
print(f"positionX:        {m.get('positionX', 'MISSING')}")
print(f"positionY:        {m.get('positionY', 'MISSING')}")

print()
print('=== STYLE FROM DB ===')
print(f"fontSize (raw):   {s['fontSize']}  <-- native pixel value stored in DB")
print(f"positionX:        {s['positionX']}")
print(f"positionY:        {s['positionY']}")
print(f"alignment:        {s['alignment']}")

print()
print('=== BUG ANALYSIS ===')
scale = m['scaleFactor']
fs_meas = m['fontSize']  # already native - was multiplied by scaleFactor in getRenderedMeasurements

print(f"scaleFactor = {scale}")
print()
print(f"export.py line 197: font_size = int(round(css_font_size * scale))")
print(f"  css_font_size = measurements.fontSize = {fs_meas}  (BUG: this is ALREADY native, not CSS)")
print(f"  font_size would be = {int(round(fs_meas * scale))}  (WRONG - double-scaled!)")
print()
print(f"Correct font_size should be = {int(round(fs_meas))}  (just use measurements.fontSize directly)")
print()

bo = m['bottomOffset']
print(f"export.py line 205: margin_y = int(round(css_bottom_offset * scale))")
print(f"  css_bottom_offset = measurements.bottomOffset = {bo}  (BUG: also already native)")
print(f"  margin_y would be = {int(round(bo * scale))}  (WRONG - double-scaled!)")
print()
print(f"Correct margin_y should be = {int(round(bo))}  (just use measurements.bottomOffset directly)")
print()

print('=== POSITION BUG ===')
pos_y = s['positionY']
print(f"style.positionY = {pos_y}  (this is a % offset from center, e.g. 0 = center, 40 = bottom)")
print(f"export.py uses 'position' field which is 'top'/'center'/'bottom'")
print(f"measurements.position = '{m.get('position', 'MISSING')}'")
print()
print(f"The subtitle appears in the MIDDLE of the video.")
print(f"This is because positionY=0 => position='center' => alignment=5 (middle center in ASS)")
print(f"But default should be BOTTOM unless user changed it.")
print()

print('=== LAYOUT WORD COORDS ===')
layouts = m.get('layouts', [])
if layouts:
    first = layouts[0]
    print(f"First segment has {len(first['words'])} words")
    print(f"First word coords: x={first['words'][0]['x']:.1f}, y={first['words'][0]['y']:.1f}")
    print(f"Segment box: x={first['box']['x']:.1f}, y={first['box']['y']:.1f}, w={first['box']['w']:.1f}, h={first['box']['h']:.1f}")
    print()
    print(f"NOTE: layout coords are already in NATIVE pixels (multiplied by scaleFactor in getRenderedMeasurements)")
    print(f"export.py render_word: nx = int(round(layout_w['x']))  <- reads raw x")
    print(f"BUT THEN: nx += int(round(rs.get('x', 0) * scale))  <- adds offset with scale again")
    print()
    print(f"Core positions look: y of first word = {first['words'][0]['y']:.1f} native pixels")
    print(f"This should place text at ~{first['words'][0]['y']:.1f}/{m['videoHeight']} = {first['words'][0]['y']/m['videoHeight']*100:.1f}% from top of video")
