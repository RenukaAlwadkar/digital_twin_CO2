import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// EcoTwin Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9zj4tXaYMcIIJOzeF4LRADiav3qffFVU",
  authDomain: "ecotwin-b4bbf.firebaseapp.com",
  projectId: "ecotwin-b4bbf",
  storageBucket: "ecotwin-b4bbf.firebasestorage.app",
  messagingSenderId: "205060586747",
  appId: "1:205060586747:web:dad0ac2d288761a455845e"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore database
export const db = getFirestore(app);

export default app;
