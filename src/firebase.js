import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "catat-yuk-f7daa"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
