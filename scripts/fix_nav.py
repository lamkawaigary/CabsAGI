#!/usr/bin/env python3
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    # Find the line with "{/* Bottom Navigation */}"
    bottom_nav_start = None
    bottom_nav_end = None
    
    for i, line in enumerate(lines):
        if '{/* Bottom Navigation */}' in line:
            bottom_nav_start = i
        if bottom_nav_start is not None and '</nav>' in line:
            bottom_nav_end = i
            break
    
    if bottom_nav_start is None:
        return False
    
    # Replace the entire bottom nav block with <BottomNav />
    new_lines = lines[:bottom_nav_start] + ['      <BottomNav />\n'] + lines[bottom_nav_end+1:]
    
    with open(filepath, 'w') as f:
        f.writelines(new_lines)
    
    return True

files = [
    '/Users/gary/Desktop/CabsAGI/src/pages/driver/DriverSettingsPage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/passenger/PassengerHomePage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/passenger/PassengerBrowsePage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/passenger/PassengerRequestsPage.tsx',
    '/Users/gary/Desktop/CabsAGI/src/pages/passenger/PassengerSettingsPage.tsx',
]

for f in files:
    result = fix_file(f)
    print(f"{'Fixed' if result else 'Not found'}: {f.split('/')[-1]}")