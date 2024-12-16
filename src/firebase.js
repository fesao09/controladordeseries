
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyByYAOsPiy6easaVA9LZCm_bktQq9tvDLY",
  authDomain: "tv-time-3afd4.firebaseapp.com",
  databaseURL: "https://tv-time-3afd4-default-rtdb.firebaseio.com/", 
  projectId: "tv-time-3afd4",
  storageBucket: "tv-time-3afd4.firebasestorage.app",
  messagingSenderId: "105850093197",
  appId: "1:105850093197:web:4e19c653d4c09dbf5becc4",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, get, remove };
