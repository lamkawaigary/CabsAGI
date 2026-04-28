#!/bin/bash
# Remove inline bottomNav from all pages and replace with BottomNav component

files=(
  "src/pages/driver/DriverBrowsePage.tsx"
  "src/pages/driver/DriverSettingsPage.tsx"
  "src/pages/passenger/MyTripsPage.tsx"
  "src/pages/passenger/PassengerBrowsePage.tsx"
  "src/pages/passenger/PassengerHomePage.tsx"
  "src/pages/passenger/PassengerRequestsPage.tsx"
  "src/pages/passenger/PassengerSettingsPage.tsx"
)

for file in "${files[@]}"; do
  fullpath="~/Desktop/CabsAGI/$file"
  echo "Processing: $file"
  
  # Use python to do the replacement
  python3 << PYTHON
import re

filepath = "$fullpath".replace("~", "/Users/gary")

with open(filepath, 'r') as f:
    content = f.read()

# Pattern to match the entire inline bottomNav block
# From "/* Bottom Navigation */" to the closing "</nav>"
old_pattern = r'''{/\* Bottom Navigation \*/}
      <nav style=\{styles\.bottomNav\}>
        <button style=\{styles\.navItem[^}]*}>
          首頁
        </button>
        <button style=\{styles\.navItem[^}]*}>
          📋 需求
        </button>
        <button style=\{styles\.navItem[^}]*}>
          🚗 行程
        </button>
        <button style=\{styles\.navItem[^}]*}>
          💬 聊天
        </button>
        <button style=\{styles\.navItem[^}]*}>
          設定
        </button>
      </nav>'''

new_content = re.sub(old_pattern, '<BottomNav />', content)

if new_content != content:
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"  Updated: $file")
else:
    print(f"  No change: $file")
PYTHON
done