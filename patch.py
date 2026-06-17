import re

with open('src/components/editor/style-panel.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Find TextTab
start_idx = text.find('function TextTab() {')
end_idx = text.find('function PositionTab() {')

text_tab = text[start_idx:end_idx]

# Replace subtitleStyle with activeStyle inside the return statement
return_idx = text_tab.find('return (')
body = text_tab[return_idx:]

body = body.replace('subtitleStyle.font.family', 'activeStyle.font.family')
body = body.replace('subtitleStyle.fontSize', 'activeStyle.fontSize')
body = body.replace('subtitleStyle.font.weight', 'activeStyle.font.weight')
body = body.replace('subtitleStyle.font.italic', 'activeStyle.font.italic')
body = body.replace('subtitleStyle.font.underline', 'activeStyle.font.underline')
body = body.replace('subtitleStyle.font.textTransform', 'activeStyle.font.textTransform')
body = body.replace('subtitleStyle.letterSpacing', 'activeStyle.letterSpacing')
body = body.replace('subtitleStyle.wordSpacing', 'activeStyle.wordSpacing')
body = body.replace('subtitleStyle.lineSpacing', 'activeStyle.lineSpacing')
body = body.replace('subtitleStyle.textColor.solid', 'activeStyle.textColor.solid')
body = body.replace('subtitleStyle.activeWordColor', 'activeStyle.activeWordColor')
body = body.replace('subtitleStyle.stroke.enabled', 'activeStyle.stroke.enabled')
body = body.replace('subtitleStyle.stroke.color', 'activeStyle.stroke.color')
body = body.replace('subtitleStyle.stroke.width', 'activeStyle.stroke.width')
body = body.replace('subtitleStyle.shadow.blur', 'activeStyle.shadow.blur')
body = body.replace('subtitleStyle.shadow.offsetX', 'activeStyle.shadow.offsetX')
body = body.replace('subtitleStyle.shadow.offsetY', 'activeStyle.shadow.offsetY')
body = body.replace('subtitleStyle.shadow.color', 'activeStyle.shadow.color')
body = body.replace('subtitleStyle.background.enabled', 'activeStyle.background.enabled')
body = body.replace('subtitleStyle.background.color', 'activeStyle.background.color')
body = body.replace('subtitleStyle.background.opacity', 'activeStyle.background.opacity')
body = body.replace('subtitleStyle.background.borderRadius', 'activeStyle.background.borderRadius')
body = body.replace('subtitleStyle.inactiveOpacity', 'activeStyle.inactiveOpacity')
body = body.replace('subtitleStyle.blur', 'activeStyle.blur')

# Now replace the setters
body = body.replace('setSubtitleStyleV2((s) => ({\n              ...s,\n              font: { ...s.font, family },\n            }))', 'updateFont({ family }, { fontFamily: family })')
body = body.replace('setSubtitleStyleV2((s) => ({ ...s, fontSize: v }))', "updateNumber('fontSize', 'fontSize', v)")
body = body.replace('setSubtitleStyleV2((s) => ({\n                ...s,\n                font: { ...s.font, weight: Number(e.target.value) },\n              }))', 'updateFont({ weight: Number(e.target.value) }, { fontWeight: Number(e.target.value) })')
body = body.replace('setSubtitleStyleV2((s) => ({\n                ...s,\n                font: { ...s.font, italic: !s.font.italic },\n              }))', 'updateFont({ italic: !activeStyle.font.italic }, { italic: !activeStyle.font.italic })')
body = body.replace('setSubtitleStyleV2((s) => ({\n                ...s,\n                font: { ...s.font, underline: !s.font.underline },\n              }))', 'updateFont({ underline: !activeStyle.font.underline }, { underline: !activeStyle.font.underline })')
body = body.replace('setSubtitleStyleV2((s) => ({\n                  ...s,\n                  font: { ...s.font, textTransform: t },\n                }))', 'updateFont({ textTransform: t }, { textTransform: t })')

body = body.replace('setSubtitleStyleV2((s) => ({ ...s, letterSpacing: v }))', "updateNumber('letterSpacing', 'letterSpacing', v)")
body = body.replace('setSubtitleStyleV2((s) => ({ ...s, wordSpacing: v }))', "setSubtitleStyleV2((s) => ({ ...s, wordSpacing: v }))") # Word spacing is global, don't update word
body = body.replace('setSubtitleStyleV2((s) => ({ ...s, lineSpacing: v }))', "setSubtitleStyleV2((s) => ({ ...s, lineSpacing: v }))") # Line spacing is global

body = body.replace('setSubtitleStyleV2((s) => ({\n              ...s,\n              textColor: { ...s.textColor, solid: c },\n            }))', 'updateColor(c)')
body = body.replace('setSubtitleStyleV2((s) => ({ ...s, activeWordColor: c }))', 'setSubtitleStyleV2((s) => ({ ...s, activeWordColor: c }))') # Global

body = body.replace('setSubtitleStyleV2((s) => ({\n              ...s,\n              stroke: { ...s.stroke, enabled: v },\n            }))', 'updateStroke({ enabled: v }, { strokeWidth: v ? 1 : 0 })') # Rough mapping for enable
body = body.replace('setSubtitleStyleV2((s) => ({\n                  ...s,\n                  stroke: { ...s.stroke, color: c },\n                }))', 'updateStroke({ color: c }, { strokeColor: c })')
body = body.replace('setSubtitleStyleV2((s) => ({\n                  ...s,\n                  stroke: { ...s.stroke, width: v },\n                }))', 'updateStroke({ width: v }, { strokeWidth: v })')

body = body.replace('setSubtitleStyleV2((s) => ({\n                  ...s,\n                  shadow: { ...s.shadow, blur: v },\n                }))', 'updateShadow({ blur: v }, { shadowBlur: v })')
body = body.replace('setSubtitleStyleV2((s) => ({\n                  ...s,\n                  shadow: { ...s.shadow, offsetX: v },\n                }))', 'updateShadow({ offsetX: v }, { shadowOffsetX: v })')
body = body.replace('setSubtitleStyleV2((s) => ({\n                  ...s,\n                  shadow: { ...s.shadow, offsetY: v },\n                }))', 'updateShadow({ offsetY: v }, { shadowOffsetY: v })')
body = body.replace('setSubtitleStyleV2((s) => ({\n                ...s,\n                shadow: { ...s.shadow, color: c },\n              }))', 'updateShadow({ color: c }, { shadowColor: c })')

body = body.replace('setSubtitleStyleV2((s) => ({\n              ...s,\n              background: { ...s.background, enabled: v },\n            }))', 'updateBackground({ enabled: v }, { backgroundColor: v ? activeStyle.background.color : undefined })')
body = body.replace('setSubtitleStyleV2((s) => ({\n                  ...s,\n                  background: { ...s.background, color: c },\n                }))', 'updateBackground({ color: c }, { backgroundColor: c })')
body = body.replace('setSubtitleStyleV2((s) => ({\n                    ...s,\n                    background: { ...s.background, opacity: v },\n                  }))', 'updateBackground({ opacity: v }, {})') # Not fully supported at word level without rgba parsing, but good enough
body = body.replace('setSubtitleStyleV2((s) => ({\n                    ...s,\n                    background: { ...s.background, borderRadius: v },\n                  }))', 'updateBackground({ borderRadius: v }, { borderRadius: v })')

body = body.replace('setSubtitleStyleV2((s) => ({ ...s, inactiveOpacity: v }))', "updateNumber('inactiveOpacity', 'opacity', v)")
body = body.replace('setSubtitleStyleV2((s) => ({ ...s, blur: v }))', 'setSubtitleStyleV2((s) => ({ ...s, blur: v }))') # Global

text_tab = text_tab[:return_idx] + body
text = text[:start_idx] + text_tab + text[end_idx:]

with open('src/components/editor/style-panel.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Patch applied successfully!')
