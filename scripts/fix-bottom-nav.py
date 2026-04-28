#!/usr/bin/env python3
import re
import os

def remove_inline_bottom_nav(content):
    # Remove the inline bottomNav section (from "{/* Bottom Navigation */}" to "</nav>")
    # This is a simplified approach - remove the old nav block
    pattern = r'\s*/\*[\*]* Bottom Navigation \*/\s*<nav[^>]*>.*?</nav>'
    content = re.sub(pattern, '\n      <BottomNav />', content, flags=re.DOTALL)
    return content

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if BottomNav import exists
    if "import BottomNav from '../../components/BottomNav'" not in content:
        return False
    
    # Remove inline bottomNav and replace with component
    new_content = remove_inline_bottom_nav(content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

# Process all files
files = [
    '/Users/gary/Desktop/CabsAGI/src/pages/driver/DriverBrowsePage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/driver/DriverSettingsPage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/driver/DriverTripsPage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/driver/DriverHomePage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/passenger/MyTripsPage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/passenger/PassengerBrowsePage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/passenger/PassengerHomePage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/passenger/PassengerRequestsPage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/passenger/PassengerSettingsPage.tsx',
]

for f in files:
    if os.path.exists(f):
        result = process_file(f)
        print(f"Processed {os.path.basename(f)}: {'OK' if result else 'No change'}")
    else:
        print(f"Not found: {f}")