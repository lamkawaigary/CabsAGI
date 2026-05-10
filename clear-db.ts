import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './src/firebaseConfig';

async function clearCollection(name: string) {
  const snap = await getDocs(collection(db, name));
  console.log('Deleting', snap.size, 'docs from', name);
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, name, d.id))));
  console.log('Cleared', name);
}

(async () => {
  try {
    await clearCollection('trips');
    await clearCollection('chatRooms');
    await clearCollection('chatMessages');
    await clearCollection('priceQuotes');
    await clearCollection('passengerRequests');
    await clearCollection('listings');
    console.log('All collections cleared!');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
