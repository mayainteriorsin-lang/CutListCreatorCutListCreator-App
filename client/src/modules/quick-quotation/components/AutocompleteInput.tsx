/**
 * Quick Quotation Module - Autocomplete Input
 *
 * Powerful autocomplete for item descriptions with:
 * - Fuzzy matching
 * - Shortcut expansion
 * - Common furniture suggestions
 * - Keyboard navigation
 */

import { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useShortcuts, useMainItems, useAdditionalItems } from '../store/quickQuotationStore';
import { useDictionary } from '@/modules/dictionary';
import type { ItemShortcut } from '../types';

// Common interior/furniture items for suggestions
const COMMON_ITEMS = [
  // Standalone room/area names (for quick suggestions)
  'Kitchen', 'Bedroom', 'Bathroom', 'Living Room', 'Dining Room', 'Study Room',
  'Balcony', 'Terrace', 'Foyer', 'Entrance', 'Corridor', 'Passage', 'Store Room',
  'Pooja Room', 'Kids Room', 'Guest Room', 'Master Bedroom', 'Drawing Room',
  'Hall', 'Lobby', 'Utility', 'Servant Room', 'Wardrobe Area', 'Dressing Area',
  // Kitchen - Cabinets & Shutters
  'Kitchen Cabinet', 'Kitchen Shutter', 'Kitchen Loft', 'Kitchen Countertop',
  'Kitchen Base Unit', 'Kitchen Wall Unit', 'Kitchen Tall Unit', 'Kitchen Island',
  'Upper Cabinet', 'Lower Cabinet', 'Base Cabinet', 'Wall Cabinet',
  'Shutter', 'Profile Shutter', 'Glass Shutter', 'Aluminium Shutter',
  'Acrylic Shutter', 'PVC Shutter', 'Membrane Shutter', 'Lacquer Shutter',
  // Kitchen - Accessories & Pullouts
  'Chimney Hood', 'Sink Unit', 'Dish Rack', 'Spice Rack', 'Bottle Pullout',
  'Cutlery Tray', 'Plate Rack', 'Cup & Saucer Rack', 'Grain Pullout',
  'Dustbin Pullout', 'Oil Pullout', 'Mixer Pullout', 'Corner Carousel',
  'Magic Corner', 'Tandem Box', 'Drawer Basket', 'Plain Basket',
  'Microwave Unit', 'Oven Unit', 'Hob Unit', 'Fridge Unit',
  'Breakfast Counter', 'Service Counter', 'Wet Kitchen', 'Dry Kitchen',
  // Wardrobe & Closet
  'Wardrobe', 'Wardrobe Shutter', 'Wardrobe Loft', 'Sliding Wardrobe',
  'Walk-in Closet', 'Dressing Unit', 'Shoe Rack', 'Tie Rack',
  'Wardrobe Interior', 'Trouser Pullout', 'Saree Tray', 'Jewellery Tray',
  'Belt Rack', 'Accessory Tray', 'Shirt Partition', 'Hanger Rod',
  'Mirror Shutter', 'Soft Close Hinge', 'Wardrobe Handle', 'Profile Handle',
  // Living Room
  'TV Unit', 'TV Panel', 'Entertainment Unit', 'Bookshelf', 'Display Unit',
  'Sofa', 'Center Table', 'Side Table', 'Console Table',
  'Media Unit', 'Wall Ledge', 'Floating Shelf', 'Corner Shelf',
  'Magazine Rack', 'Accent Wall', 'Feature Wall', 'Wall Cladding',
  'Mandir Wall', 'Photo Frame Wall', 'Gallery Wall',
  // Bedroom
  'Bed', 'Cot', 'Headboard', 'Side Table', 'Study Table', 'Dressing Table',
  'King Bed', 'Queen Bed', 'Single Bed', 'Double Bed', 'Diwan',
  'Bed Back Panel', 'Bed Side Unit', 'Night Stand', 'Bedside Drawer',
  'Vanity Unit', 'Vanity Mirror', 'Makeup Station', 'Jewellery Unit',
  // Kids Room
  'Kids Bed', 'Bunk Bed', 'Loft Bed', 'Trundle Bed',
  'Kids Wardrobe', 'Kids Study Table', 'Kids Bookshelf',
  'Toy Storage', 'Kids Chair', 'Play Area',
  // Study & Office
  'Study Table', 'Computer Table', 'Office Table', 'Work Desk',
  'Office Chair', 'Executive Chair', 'Ergonomic Chair',
  'Book Rack', 'File Rack', 'Paper Tray', 'Pen Stand',
  'Cabin Partition', 'Workstation', 'Reception Counter', 'Conference Table',
  // Dining
  'Dining Table', 'Dining Chair', 'Crockery Unit', 'Bar Unit', 'Bar Counter',
  'Buffet Unit', 'Sideboard', 'Wine Rack', 'Glass Rack',
  'Dining Bench', 'High Chair', 'Bar Stool', 'Kitchen Stool',
  // Pooja Room
  'Pooja Unit', 'Pooja Mandap', 'Pooja Shelf', 'Pooja Cabinet',
  'Mandir', 'Temple Unit', 'Bell Hanger', 'Diya Stand',
  'Pooja Platform', 'Pooja Door', 'Jali Work', 'Brass Work',
  // Bathroom & Utility
  'Vanity Cabinet', 'Mirror Cabinet', 'Bathroom Cabinet',
  'Wash Basin Unit', 'Under Sink Cabinet', 'Towel Rack',
  'Utility Rack', 'Washing Area', 'Ironing Board', 'Laundry Unit',
  // Doors & Windows
  'Door', 'Main Door', 'Bedroom Door', 'Bathroom Door', 'Pooja Door',
  'Sliding Door', 'Folding Door', 'Glass Door', 'Flush Door',
  'Panel Door', 'Membrane Door', 'Veneer Door', 'Laminate Door',
  'Window', 'Window Frame', 'Window Shutter', 'French Window',
  'Bay Window', 'Ventilator', 'Skylight',
  // Ceiling & Wall
  'False Ceiling', 'POP Ceiling', 'Gypsum Ceiling', 'Grid Ceiling',
  'Wooden Ceiling', 'Coffered Ceiling', 'Tray Ceiling', 'Cove Ceiling',
  'Wall Panel', 'Wall Paneling', 'Wainscoting', 'Dado',
  'Partition', 'Glass Partition', 'Wooden Partition', 'Gypsum Partition',
  'Accent Panel', 'Charcoal Panel', 'Louver Panel', 'Fluted Panel',
  // Flooring
  'Flooring', 'Wooden Flooring', 'Laminate Flooring', 'Vinyl Flooring',
  'Tiles', 'Vitrified Tiles', 'Ceramic Tiles', 'Marble',
  'Granite', 'Italian Marble', 'Kota Stone', 'Mosaic',
  'Skirting', 'Floor Skirting', 'Wall Skirting',
  // Electrical & Lighting
  'Electrical Point', 'Switch Board', 'Light Fixture',
  'Power Point', 'TV Point', 'AC Point', 'Geyser Point',
  'Chandelier', 'Pendant Light', 'Spot Light', 'Cove Light',
  'LED Strip', 'Profile Light', 'Track Light', 'Wall Light',
  'Table Lamp', 'Floor Lamp', 'Bed Lamp', 'Study Lamp',
  // Work Types
  'Painting', 'POP Work', 'Gypsum Work', 'Carpentry',
  'Polishing', 'Duco Paint', 'PU Polish', 'Melamine Polish',
  'Lamination', 'Veneering', 'Edge Banding', 'Lipping',
  'Civil Work', 'Masonry Work', 'Plumbing Work', 'Waterproofing',
  'Fabrication', 'MS Fabrication', 'SS Fabrication', 'Glass Work',
  'Installation', 'Assembly', 'Dismantling', 'Shifting',
  // Materials
  'Plywood', 'MDF', 'Particle Board', 'Block Board',
  'BWP Ply', 'BWR Ply', 'Marine Ply', 'Commercial Ply',
  'Laminate', 'Sunmica', 'Veneer', 'Natural Veneer',
  'PVC Sheet', 'Acrylic Sheet', 'Glass', 'Mirror',
  'Corian', 'Quartz', 'Granite Top', 'Marble Top',
  // Hardware & Accessories
  'Handle', 'Knob', 'Profile Handle', 'Concealed Handle',
  'Hinge', 'Soft Close Hinge', 'Auto Hinge', 'Glass Hinge',
  'Channel', 'Telescopic Channel', 'Drawer Slide', 'Runner',
  'Lock', 'Drawer Lock', 'Cabinet Lock', 'Digital Lock',
  // Storage & Organization
  'Loft', 'Loft Shutter', 'Storage Unit', 'Filing Cabinet',
  'Drawer Unit', 'Pull Out', 'Corner Unit', 'Blind Corner',
  'Open Shelf', 'Closed Cabinet', 'Glass Cabinet', 'Display Cabinet',
  'Hanging Unit', 'Wall Mount', 'Floor Standing',
  // Outdoor & Balcony
  'Balcony Railing', 'Balcony Grill', 'Balcony Seating',
  'Planter Box', 'Garden Bench', 'Outdoor Table',
  'Pergola', 'Gazebo', 'Canopy', 'Awning',
  // Miscellaneous
  'Curtain Rod', 'Curtain Track', 'Blind', 'Roller Blind',
  'Mosquito Net', 'Safety Grill', 'Window Grill',
  'Staircase Railing', 'Handrail', 'Balustrade',
  'Name Board', 'Sign Board', 'Letter Box',
  // Indian Specific Items
  'TV Unit with Mandir', 'Mandir with TV Panel', 'LED Backlit Mandir',
  'Floating Mandir', 'Wall Mounted Mandir', 'Marble Mandir', 'Teak Mandir',
  'Sheesham Wood Mandir', 'Jaali Panel', 'Jaali Door', 'Jaali Screen',
  'Masala Rack', 'Masala Dabba Tray', 'Thali Rack', 'Pressure Cooker Rack',
  'Chapati Rolling Station', 'Wet Grinder Unit', 'Mixer Grinder Unit',
  'Steel Rack', 'SS Rack', 'Thali Stand', 'Kadai Stand',
  // Kitchen Hardware (Brand Specific)
  'Hettich Tandem Box', 'Hafele Tandem Box', 'Blum Tandem Box',
  'Hettich Magic Corner', 'Hafele Magic Corner', 'Blum Magic Corner',
  'Hettich Carousel', 'Hafele Carousel', 'S Carousel', 'D Carousel',
  'Hettich Channel', 'Hafele Channel', 'Ebco Channel', 'Blum Channel',
  'Hettich Hinge', 'Hafele Hinge', 'Blum Hinge', 'Grass Hinge',
  'Legrabox', 'Merivobox', 'Metabox', 'Innotech Drawer',
  'Vertical Pantry', 'Tall Pantry Unit', 'Larder Unit', 'Provisions Unit',
  'Wicker Basket', 'SS Wire Basket', 'Perforated Basket',
  'Cup Board', 'Overhead Unit', 'Under Counter Unit',
  // More Kitchen Accessories
  'Cutlery Insert', 'Knife Block', 'Spoon Holder', 'Ladle Holder',
  'Plate Organizer', 'Lid Holder', 'Tawa Stand', 'Pan Organizer',
  'Under Sink Organizer', 'Sink Basket', 'Corner Basket', 'L Corner Unit',
  'Detergent Pullout', 'Cleaning Supplies Unit', 'Dustbin Unit',
  'Cutlery Drawer', 'Utensil Drawer', 'Deep Drawer',
  'Handleless Shutter', 'Gola Profile', 'J Profile', 'G Profile',
  'Touch to Open', 'Push to Open', 'Servo Drive', 'Tip On',
  // More Wardrobe Accessories
  'Coat Hanger', 'Dress Hanger', 'Saree Rod', 'Dupatta Hanger',
  'Watch Drawer', 'Sunglasses Tray', 'Cufflinks Tray', 'Ring Holder',
  'Blanket Storage', 'Bedsheet Drawer', 'Pillow Storage',
  'Ironing Board Pullout', 'Full Length Mirror', 'Rotating Mirror',
  'LED Wardrobe Light', 'Sensor Light', 'Motion Sensor Light',
  'Hydraulic Bed', 'Storage Bed', 'Box Bed', 'Lift Up Bed',
  // More Materials & Finishes
  'HDHMR', 'HDF', 'Pre-Laminated Board', 'Pre-Lam MDF',
  'Greenply', 'Century Ply', 'Archid Ply', 'Kitply',
  'Merino Laminate', 'Greenlam', 'Royale Touche', 'Virgo Laminate',
  'Decowood Veneer', 'Elegant Veneer', 'Teak Veneer', 'Walnut Veneer',
  'Oak Veneer', 'Rosewood Veneer', 'Ash Veneer', 'Maple Veneer',
  'Glossy Finish', 'Matte Finish', 'Satin Finish', 'Textured Finish',
  'Anti-Scratch Laminate', 'Anti-Fingerprint', 'Suede Finish',
  'High Gloss Acrylic', 'Matt Acrylic', 'Back Painted Glass',
  'Lacquered Glass', 'Frosted Glass', 'Tinted Glass', 'Etched Glass',
  'Stainless Steel 304', 'SS 202', 'MS Powder Coated', 'Brass Finish',
  'Rose Gold Finish', 'Antique Finish', 'Chrome Finish', 'Black Finish',
  // More Work Types
  'Primer Coat', 'Putty Work', 'Wall Putty', 'White Cement',
  'Texture Paint', 'Stucco', 'Wallpaper', 'Wall Sticker',
  'Epoxy Flooring', 'PU Flooring', 'Self Leveling Floor',
  'Tile Grouting', 'Tile Laying', 'Tile Cutting', 'Border Tile',
  'False Ceiling Work', 'Ceiling Light Point', 'AC Duct Covering',
  'Curtain Box', 'Pelmet', 'Curtain Pelmet', 'AC Box',
  'Wiring Work', 'Concealed Wiring', 'Surface Wiring', 'MCB Box',
  'CCTV Point', 'Network Point', 'Intercom Point', 'Doorbell Point',
  'Exhaust Fan Point', 'Chimney Point', 'Purifier Point',
  // Appliances & Electronics
  'Built-in Hob', 'Built-in Oven', 'Built-in Microwave', 'Built-in Dishwasher',
  'Chimney', 'Island Chimney', 'Wall Mounted Chimney', 'Built-in Chimney',
  'Water Purifier', 'Water Softener', 'Geyser', 'Instant Geyser',
  'Split AC', 'Cassette AC', 'Concealed AC', 'AC Stabilizer',
  'Ceiling Fan', 'Wall Fan', 'Exhaust Fan', 'Fresh Air Fan',
  // Entry & Security
  'Main Gate', 'Grill Gate', 'MS Gate', 'SS Gate', 'Automatic Gate',
  'Door Frame', 'Chaukhat', 'Door Architrave', 'Door Jamb',
  'Door Stopper', 'Door Closer', 'Floor Spring', 'Door Handle Set',
  'Night Latch', 'Mortise Lock', 'Cylindrical Lock', 'Rim Lock',
  'Video Door Phone', 'Smart Lock', 'Biometric Lock', 'Fingerprint Lock',
  'Peephole', 'Door Viewer', 'Safety Chain', 'Door Guard',
  // Passage & Corridor
  'Passage Light', 'Corridor Light', 'Step Light', 'Foot Light',
  'Wall Niche', 'Display Niche', 'Artefact Shelf', 'Console',
  'Umbrella Stand', 'Coat Rack', 'Key Holder', 'Mail Box',
  // Servant Room & Utility
  'Servant Quarter', 'Servant Room Wardrobe', 'Servant Bed',
  'Broom Closet', 'Mop Holder', 'Bucket Storage', 'Cleaning Unit',
  'Water Tank Cover', 'Meter Box Cover', 'Cable Tray',
  // Terrace & Outdoor
  'Terrace Railing', 'Terrace Flooring', 'Terrace Garden',
  'Outdoor Kitchen', 'BBQ Counter', 'Pool Deck', 'Deck Flooring',
  'Wooden Deck', 'WPC Deck', 'Composite Deck', 'IPE Deck',
  'Outdoor Sofa', 'Outdoor Chair', 'Swing', 'Jhula', 'Hammock',
  // Commercial Specific
  'Reception Table', 'Reception Backdrop', 'Logo Wall',
  'Office Cabin', 'Manager Cabin', 'MD Room', 'Board Room',
  'Pantry Counter', 'Coffee Station', 'Water Dispenser Stand',
  'File Storage', 'Compactor Storage', 'Archive Rack',
  'Server Room', 'UPS Room', 'Electrical Room',
  // From Shortcuts - Exact Terms
  'Kitchen Bottom Shutter', 'Kitchen Top Shutter', 'Kitchen Drawer',
  // Hall & Foyer
  'Hall TV Unit', 'Hall False Ceiling', 'Foyer Console', 'Foyer Mirror',
  'Entrance Panel', 'Entrance Door', 'Lobby Seating', 'Waiting Area',
  // Store Room
  'Store Rack', 'Store Shelf', 'Heavy Duty Rack', 'Slotted Angle Rack',
  'Godown Rack', 'Archive Storage', 'Spare Parts Rack',
  // Prayer/Meditation
  'Meditation Corner', 'Yoga Mat Storage', 'Incense Holder', 'Bell Stand',
  'Kalash Stand', 'Idol Shelf', 'God Photo Frame',
  // Guest Room
  'Guest Bed', 'Guest Wardrobe', 'Guest TV Unit', 'Sofa Cum Bed',
  'Murphy Bed', 'Wall Bed', 'Foldable Bed',
  // Home Theater
  'Home Theater', 'Projector Mount', 'Projector Screen', 'Speaker Mount',
  'AV Console', 'Sound Bar Unit', 'Media Console',
  // Gym/Fitness
  'Gym Rack', 'Equipment Storage', 'Gym Mirror', 'Yoga Room',
  'Exercise Area', 'Punching Bag Mount', 'Dumbbell Rack',
  // Library
  'Library Shelf', 'Reading Corner', 'Reading Light', 'Book Wall',
  'Magazine Holder', 'Newspaper Stand', 'Reading Chair',
  // Pet Area
  'Pet Bed', 'Pet House', 'Pet Food Storage', 'Pet Wash Area',
  // Specific Measurements (commonly quoted)
  'Per Sqft Rate', 'Per Running Feet', 'Per Unit', 'Lumpsum',
  'Labour Charge', 'Material Cost', 'Hardware Cost', 'Finishing Cost',
  // South Indian Specific
  'Kolam Stand', 'Thinnai', 'Thinnai Seating', 'Maaligai',
  'Aruval Holder', 'Brass Lamp Stand', 'Uruli Stand',
  'Neem Wood', 'Jackfruit Wood', 'Mango Wood',
  // North Indian Specific
  'Jhoola', 'Swing Set', 'Oonjal', 'Daybed', 'Settee',
  'Bajot', 'Chowki', 'Puja Chowki', 'Chakla Belan Stand',
  // Modern Smart Home
  'Smart Panel', 'Home Automation', 'Touch Panel', 'Voice Control Unit',
  'Smart Mirror', 'Digital Frame', 'Charging Station', 'Wireless Charger',
  'Motion Sensor', 'Occupancy Sensor', 'Smart Thermostat', 'Smart Blinds',
  // Sustainability
  'Solar Panel Mount', 'Battery Storage', 'Rainwater Harvesting',
  'Vertical Garden', 'Green Wall', 'Living Wall', 'Moss Wall',
  // Specific Room Combos
  'TV with Mandir', 'Study with Bed', 'Wardrobe with Dresser',
  'Kitchen with Island', 'Dining with Bar', 'Living with Study',
];

interface Suggestion {
  text: string;
  shortcut?: string;
  rate?: number;
  amount?: number;
  score: number;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string, suggestion?: { rate?: number; amount?: number }) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

// Levenshtein distance for spell checking
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

// Check if query is a prefix with typos (e.g., "kitch" vs "kitchen")
function prefixSimilarity(word: string, query: string): number {
  if (query.length > word.length) return 0;

  // Get the prefix of the word that matches query length
  const prefix = word.substring(0, query.length);
  const distance = levenshteinDistance(prefix, query);

  // Allow 1-2 typos based on query length
  const maxTypos = query.length <= 3 ? 1 : Math.min(2, Math.floor(query.length / 3));

  if (distance <= maxTypos) {
    // Score based on how close the match is
    return 75 - (distance * 10);
  }
  return 0;
}

// Fuzzy match scoring with spell correction
function fuzzyMatch(text: string, query: string): number {
  if (!query) return 0;

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase().trim();

  // Exact match gets highest score
  if (textLower === queryLower) return 100;

  // Starts with gets high score
  if (textLower.startsWith(queryLower)) return 90;

  // Word boundary match (e.g., "tv" matches "TV Unit", "kitch" matches "Kitchen Cabinet")
  const words = textLower.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(queryLower)) return 85;
    // Check for typo in prefix (e.g., "kitchn" matches "kitchen")
    const prefixScore = prefixSimilarity(word, queryLower);
    if (prefixScore > 0) return prefixScore;
  }

  // Contains exact substring
  if (textLower.includes(queryLower)) return 70;

  // Check full word match with typos (for short queries)
  for (const word of words) {
    const distance = levenshteinDistance(word, queryLower);
    const maxDistance = Math.max(1, Math.floor(Math.min(word.length, queryLower.length) / 3));
    if (distance <= maxDistance) {
      return 65 - (distance * 5);
    }
  }

  // Fuzzy character match (all query chars appear in sequence)
  let queryIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      // Consecutive matches score higher
      if (lastMatchIdx === i - 1) {
        score += 3;
      } else {
        score += 1;
      }
      lastMatchIdx = i;
      queryIdx++;
    }
  }

  // All query chars matched
  if (queryIdx === queryLower.length) {
    return Math.min(55, score * 4);
  }

  // Partial match - most characters found
  if (queryIdx >= queryLower.length * 0.7) {
    return Math.min(40, score * 3);
  }

  return 0;
}

export const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(
  function AutocompleteInput({ value, onChange, placeholder, className, onFocus, onBlur }, ref) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const shortcuts = useShortcuts();
    const mainItems = useMainItems();
    const additionalItems = useAdditionalItems();
    const { isReady: dictReady, suggest: dictSuggest } = useDictionary();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get unique item names from existing quotation (for "recently used" suggestions)
    const recentItems = useMemo(() => {
      const items = [...mainItems, ...additionalItems];
      const names = new Set<string>();
      items.forEach(item => {
        if (item.type === 'item' && item.name && item.name.trim()) {
          names.add(item.name.trim());
        }
      });
      return Array.from(names);
    }, [mainItems, additionalItems]);

    // Combine ref
    useEffect(() => {
      if (ref && inputRef.current) {
        if (typeof ref === 'function') {
          ref(inputRef.current);
        } else {
          ref.current = inputRef.current;
        }
      }
    }, [ref]);

    // Generate suggestions based on input
    const suggestions = useMemo(() => {
      if (!value || value.length < 1) return [];

      const results: Suggestion[] = [];
      const seen = new Set<string>();

      // 1. Check shortcut codes first (highest priority)
      const shortcutKey = value.toLowerCase();
      if (shortcuts.items[shortcutKey]) {
        const item = shortcuts.items[shortcutKey];
        results.push({
          text: item.name,
          shortcut: shortcutKey,
          rate: item.rate,
          amount: item.amount,
          score: 150, // Exact shortcut match
        });
        seen.add(item.name.toLowerCase());
      }

      // 2. Search recently used items (high priority - user's own terms)
      recentItems.forEach(item => {
        const score = fuzzyMatch(item, value);
        if (score > 0 && !seen.has(item.toLowerCase())) {
          results.push({
            text: item,
            score: score + 30, // High bonus for recently used
          });
          seen.add(item.toLowerCase());
        }
      });

      // 3. Search item shortcuts by name
      Object.entries(shortcuts.items).forEach(([code, item]) => {
        const score = fuzzyMatch(item.name, value);
        if (score > 0 && !seen.has(item.name.toLowerCase())) {
          results.push({
            text: item.name,
            shortcut: code,
            rate: item.rate,
            amount: item.amount,
            score: score + 20, // Bonus for being a shortcut
          });
          seen.add(item.name.toLowerCase());
        }
      });

      // 4. Search common items
      COMMON_ITEMS.forEach(item => {
        const score = fuzzyMatch(item, value);
        if (score > 0 && !seen.has(item.toLowerCase())) {
          results.push({
            text: item,
            score,
          });
          seen.add(item.toLowerCase());
        }
      });

      // 5. Add dictionary spell suggestions (for typos/misspellings)
      if (dictReady && results.length < 8) {
        const lastWord = value.trim().split(/\s+/).pop() || '';
        if (lastWord.length >= 3) {
          const dictSuggestions = dictSuggest(lastWord, 5);
          dictSuggestions.forEach(suggestion => {
            if (!seen.has(suggestion.toLowerCase())) {
              results.push({
                text: suggestion,
                score: 45, // Lower than common items but still visible
              });
              seen.add(suggestion.toLowerCase());
            }
          });
        }
      }

      // Sort by score descending and take top 8
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
    }, [value, shortcuts.items, recentItems, dictReady, dictSuggest]);

    // Reset highlight when suggestions change
    useEffect(() => {
      setHighlightedIndex(0);
    }, [suggestions]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) {
        if (e.key === 'ArrowDown' && suggestions.length > 0) {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[highlightedIndex]) {
            selectSuggestion(suggestions[highlightedIndex]);
          }
          break;
        case 'Tab':
          if (suggestions[highlightedIndex]) {
            e.preventDefault();
            selectSuggestion(suggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    }, [isOpen, suggestions, highlightedIndex]);

    const selectSuggestion = useCallback((suggestion: Suggestion) => {
      onChange(suggestion.text, {
        rate: suggestion.rate,
        amount: suggestion.amount,
      });
      setIsOpen(false);
    }, [onChange]);

    // Handle input change
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setIsOpen(true);
    }, [onChange]);

    // Handle focus
    const handleFocus = useCallback(() => {
      if (value && value.length >= 1) {
        setIsOpen(true);
      }
      onFocus?.();
    }, [value, onFocus]);

    // Handle blur with delay to allow click on suggestion
    const handleBlur = useCallback(() => {
      setTimeout(() => {
        setIsOpen(false);
        onBlur?.();
      }, 150);
    }, [onBlur]);

    // Click outside to close
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div ref={containerRef} className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />

        {/* Suggestions dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.text}-${index}`}
                className={cn(
                  "px-3 py-2 cursor-pointer flex items-center justify-between gap-2",
                  "text-sm transition-colors",
                  index === highlightedIndex
                    ? "bg-blue-50 text-blue-900"
                    : "hover:bg-slate-50"
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(suggestion);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{suggestion.text}</span>
                  {suggestion.shortcut && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-mono rounded">
                      {suggestion.shortcut}
                    </span>
                  )}
                </div>
                {(suggestion.rate || suggestion.amount) && (
                  <span className="flex-shrink-0 text-xs text-emerald-600 font-medium">
                    {suggestion.rate
                      ? `₹${suggestion.rate}/sqft`
                      : `₹${suggestion.amount?.toLocaleString('en-IN')}`
                    }
                  </span>
                )}
              </div>
            ))}
            <div className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50 border-t">
              ↑↓ navigate • Enter/Tab select • Esc close
            </div>
          </div>
        )}
      </div>
    );
  }
);
