import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

async function run() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);
  
  const cats = await getDocs(collection(db, "categories"));
  const prods = await getDocs(collection(db, "products"));
  
  console.log("Categories in Firestore:", cats.size);
  console.log("Products in Firestore:", prods.size);
}
run().catch(console.error);
