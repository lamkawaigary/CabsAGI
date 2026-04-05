
import { db } from '../firebaseConfig';
import { collection, query, getDocs, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Region } from '../types';

export interface POI {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    regionId: Region;
    isPopular: boolean;
}

// 獲取所有 POI 標籤
export const getAllPOIs = async (): Promise<POI[]> => {
    const snap = await getDocs(query(collection(db, "pois"), orderBy("name", "asc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as POI));
};

// 根據關鍵字搜尋 POI (本地過濾)
export const searchPOIs = async (keyword: string): Promise<POI[]> => {
    const all = await getAllPOIs();
    const k = keyword.toLowerCase();
    return all.filter(p => 
        (p.name || '').toLowerCase().includes(k) || 
        (p.address || '').toLowerCase().includes(k)
    );
};

// 管理員操作：新增 POI
export const addPOI = async (poi: Omit<POI, 'id'>) => {
    return await addDoc(collection(db, "pois"), poi);
};

// 管理員操作：刪除 POI
export const deletePOI = async (id: string) => {
    await deleteDoc(doc(db, "pois", id));
};
