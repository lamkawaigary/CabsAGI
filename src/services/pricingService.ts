
import { db } from '../firebaseConfig';
import { 
    collection, query, where, getDocs, limit, doc, setDoc, 
    onSnapshot, addDoc, deleteDoc, writeBatch
} from 'firebase/firestore';
import type { PriceRule, FixedRouteRule, PricingConfig, RegionStatus, RegionConfig } from '../types';

export interface MatrixRule {
    id: string;
    fromRegion: string; 
    toRegion: string;
    basePrice: number;
    orderFee: number;
}

export const subscribeToRegionConfigs = (callback: (configs: RegionConfig[]) => void) => {
    return onSnapshot(collection(db, "region_configs"), (snap) => {
        const configs = snap.docs.map(d => ({ ...d.data() } as RegionConfig));
        callback(configs);
    });
};

export const upsertRegionConfig = async (config: RegionConfig) => {
    await setDoc(doc(db, "region_configs", config.id), {
        ...config,
        updatedAt: new Date().toISOString()
    });
};

// 新增：批量更新區域排序
export const updateRegionOrders = async (sortedConfigs: RegionConfig[]) => {
    const batch = writeBatch(db);
    sortedConfigs.forEach((config, index) => {
        const ref = doc(db, "region_configs", config.id);
        batch.update(ref, { 
            sortOrder: index,
            updatedAt: new Date().toISOString()
        });
    });
    await batch.commit();
};

export const deleteRegionConfig = async (regionId: string) => {
    await deleteDoc(doc(db, "region_configs", regionId));
    const batch = writeBatch(db);
    const q1 = query(collection(db, "pricing_matrix"), where("fromRegion", "==", regionId));
    const q2 = query(collection(db, "pricing_matrix"), where("toRegion", "==", regionId));
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    snap1.docs.forEach(d => batch.delete(d.ref));
    snap2.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};

export const updateRegionStatus = async (regionId: string, status: RegionStatus) => {
    await setDoc(doc(db, "region_configs", regionId), {
        status,
        updatedAt: new Date().toISOString()
    }, { merge: true });
};

export const getMatrixPrice = async (from: string, to: string): Promise<MatrixRule | null> => {
    const q = query(
        collection(db, "pricing_matrix"),
        where("fromRegion", "==", from),
        where("toRegion", "==", to),
        limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
        const qRev = query(
            collection(db, "pricing_matrix"),
            where("fromRegion", "==", to),
            where("toRegion", "==", from),
            limit(1)
        );
        const snapRev = await getDocs(qRev);
        return snapRev.empty ? null : { id: snapRev.docs[0].id, ...snapRev.docs[0].data() } as MatrixRule;
    }
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as MatrixRule;
};

export const updateMatrixPrice = async (rule: Omit<MatrixRule, 'id'>) => {
    const ruleId = `${rule.fromRegion}_to_${rule.toRegion}`;
    await setDoc(doc(db, "pricing_matrix", ruleId), rule, { merge: true });
};

export const getAllMatrixRules = async (): Promise<MatrixRule[]> => {
    const snap = await getDocs(collection(db, "pricing_matrix"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MatrixRule));
};

export const subscribeToPriceRules = (callback: (rules: PriceRule[]) => void) => {
    const q = query(collection(db, "price_rules"), limit(200));
    return onSnapshot(q, (snapshot) => {
        const rules = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PriceRule));
        callback(rules);
    });
};

export const subscribeToFixedRules = (callback: (rules: FixedRouteRule[]) => void) => {
    const q = query(collection(db, "fixed_route_rules"), limit(100));
    return onSnapshot(q, (snapshot) => {
        const rules = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FixedRouteRule));
        callback(rules);
    });
};

export const subscribeToPricingConfig = (callback: (config: PricingConfig) => void) => {
    return onSnapshot(doc(db, "config", "pricing"), (snap) => {
        if (snap.exists()) callback(snap.data() as PricingConfig);
    });
};

export const updatePricingConfigService = async (config: Partial<PricingConfig>) => {
    await setDoc(doc(db, "config", "pricing"), config, { merge: true });
};

export const addPriceRuleService = async (rule: Partial<PriceRule>) => {
    await addDoc(collection(db, "price_rules"), rule);
};

export const deletePriceRuleService = async (id: string) => {
    await deleteDoc(doc(db, "price_rules", id));
};

export const addFixedRuleService = async (rule: Partial<FixedRouteRule>) => {
    await addDoc(collection(db, "fixed_route_rules"), rule);
};

export const deleteFixedRuleService = async (id: string) => {
    await deleteDoc(doc(db, "fixed_route_rules", id));
};
