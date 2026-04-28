#!/bin/bash
# Quick cleanup - Run this in your Mac terminal

cd ~/Desktop/CabsAGI

# Use Firebase CLI to list and cleanup chatRooms
echo "=== 聊天室清理腳本 ==="
echo ""
echo "在 Firebase Console 手動刪除重複的聊天室："
echo ""
echo "1. 選擇同一個 roomType + roomTypeId 的重複記錄"
echo "2. 保留最新的一個（createdAt 最晚）"
echo "3. 刪除其他重複的"
echo ""
echo "或者，在 Firebase Console 的 chatRooms 頁面："
echo "- 按 roomTypeId 排序"
echo "- 找出相同的 roomType + roomTypeId 組合"
echo "- 刪除較舊的記錄"
echo ""
echo "=== 快速查看重複 ==="

# Query Firestore using Firebase CLI
npx firebase firestore:export /tmp/firestore-backup.json --project cabs-agi-a779f 2>/dev/null || echo "Please export manually"

echo ""
echo "請打開 Firebase Console 手动删除重复的聊天室"
echo "URL: https://console.firebase.google.com/project/cabs-agi-a779f/firestore/data/chatRooms"