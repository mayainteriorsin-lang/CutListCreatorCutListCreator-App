# Kitchen Cabinet Cutting List Generator - Design Guidelines

## Design Approach

**Selected Approach**: Design System (Material Design-inspired)
**Justification**: Utility-focused productivity tool requiring clarity, data hierarchy, and professional functionality. Blue primary color aligns with trustworthy, professional aesthetic.

**Key References**: Linear (clean data tables), Notion (organized inputs), Airtable (structured information)

## Core Design Elements

### Typography
- **Headings**: Inter or Work Sans, 600-700 weight
- **Body/Labels**: Same family, 400-500 weight
- **Data/Numbers**: Tabular figures (font-feature-settings: 'tnum'), 500 weight for emphasis
- **Hierarchy**: Page title (text-2xl), Section headers (text-lg), Labels (text-sm), Data (text-base)

### Layout System
**Spacing Units**: Tailwind 2, 4, 6, 8, 12 units
- Component padding: p-6 to p-8
- Section gaps: gap-6 or gap-8
- Button spacing: px-6 py-3
- Input fields: p-3
- Card containers: p-8

### Component Library

**Action Button Group** (Top-right toolbar):
- Container: `flex gap-3 items-center`
- "Add Cabinet" button (Primary blue): Prominent, filled style
- "Preview" button (Secondary): Blue outline/ghost style with icon
- Both buttons: Same height (h-11), rounded-lg, font-medium

**Data Input Cards**:
- White background with subtle border (border-gray-200)
- Rounded corners (rounded-xl)
- Organized form fields with clear labels above inputs
- Input groups in grid layout (grid-cols-1 md:grid-cols-2 gap-4)

**Cutting List Table**:
- Alternating row backgrounds for readability
- Fixed header row with medium weight text
- Monospace numbers for alignment
- Action column (edit/delete icons) on right
- Hover state: subtle background change

**Form Inputs**:
- Height: h-11
- Border: border-gray-300, focus:border-blue-500
- Background: white with focus ring
- Number inputs: Right-aligned text for measurements

**Navigation/Header**:
- Top bar with app title (left), action buttons (right)
- Height: h-16
- Border bottom for separation
- Sticky positioning

### Visual Hierarchy
1. Primary actions (blue buttons) - highest contrast
2. Data tables and measurement inputs - clear, readable
3. Secondary controls and labels - supportive gray tones
4. Background and containers - minimal, clean

### Data Display Patterns
- **Cabinet Cards**: Stacked vertically with dividers, showing dimensions and cut list summary
- **Measurement Inputs**: Grouped logically (width/height/depth), units clearly labeled
- **Results Display**: Tabular format with clear column headers (Part, Quantity, Dimensions, Material)

### Icons
**Library**: Heroicons (outline style for secondary, solid for primary actions)
- Add: Plus icon
- Preview: Eye icon  
- Edit: Pencil icon
- Delete: Trash icon
- Cabinet: Square/Box icon

No hero section needed - this is a tool interface, not a marketing page. Launch directly into the functional workspace.