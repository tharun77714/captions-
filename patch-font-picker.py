import re

with open('src/components/editor/font-picker.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace react-window import
text = text.replace("import { FixedSizeList as List, ListChildComponentProps } from 'react-window';", "")

# Replace the list rendering
# I'll just find the List component and replace it with a standard map

list_component_pattern = re.compile(r'<List\s+height=\{360\}\s+itemCount=\{filteredFonts\.length\}\s+itemSize=\{36\}\s+width="100%"\s+itemData=\{filteredFonts\}\s+>\s+\{Row\}\s+</List>', re.MULTILINE)

replacement = """<div className="h-[360px] overflow-y-auto overflow-x-hidden">
        {filteredFonts.map((font, index) => (
          <Row key={font.family} index={index} style={{ height: 36 }} data={filteredFonts} />
        ))}
      </div>"""

text = re.sub(list_component_pattern, replacement, text)

# Now we need to fix the Row component signature
# From: const Row = React.memo(({ index, style, data }: ListChildComponentProps) => {
# To: const Row = React.memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: FontEntry[] }) => {

row_pattern = re.compile(r'const Row = React\.memo\(\(\{ index, style, data \}: ListChildComponentProps\) => \{', re.MULTILINE)
row_replacement = "const Row = React.memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: typeof FONT_REGISTRY }) => {"

text = re.sub(row_pattern, row_replacement, text)

with open('src/components/editor/font-picker.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Removed react-window!")
