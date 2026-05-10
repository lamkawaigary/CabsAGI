const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4",
  authDomain: "cabs-agi-a779f.firebaseapp.com",
  projectId: "cabs-agi-a779f",
  storageBucket: "cabs-agi-a779f.appspot.com",
  messagingSenderId: "750869730690",
  appId: "1:750869730690:web:e9a3f0c5a2f9c3c3a2f9c3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function forceRole() {
  await updateDoc(doc(db, 'users', 'qTygMkhjMgYThFwhqTh7mRK8jMv2'), {
    role: 'passenger'
  });
  console.log('Role updated to passenger');
}

forceRole().catch(console.error);
