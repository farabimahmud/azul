import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";

class FirebaseService {
    constructor() {
        this.app = null;
        this.db = null;
        this.auth = null;
        this.userId = null;
        this.gameId = null;
        this.gameDocRef = null;
        this.gameStateUnsubscribe = null;
    }

    initialize(firebaseConfig, appId) {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
        this.gameId = appId;
        return this;
    }

    async authenticate() {
        try {
            if (this.auth.currentUser) return;
            if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
                await signInWithCustomToken(this.auth, window.__initial_auth_token);
            } else {
                await signInAnonymously(this.auth);
            }
        } catch (error) {
            console.error("Authentication failed:", error);
        }
    }

    onAuthStateChanged(callback) {
        return onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.userId = user.uid;
                this.gameDocRef = doc(this.db, "artifacts", this.gameId, "public/data");
            }
            callback(user);
        });
    }

    subscribeToGameState(callback) {
        if (this.gameStateUnsubscribe) this.gameStateUnsubscribe();

        this.gameStateUnsubscribe = onSnapshot(this.gameDocRef, (docSnap) => {
            if (docSnap.exists()) {
                let receivedState = docSnap.data();

                try {
                    if (receivedState.factories && typeof receivedState.factories === 'string') {
                        receivedState.factories = JSON.parse(receivedState.factories);
                    }
                    if (receivedState.players) {
                        receivedState.players.forEach(player => {
                            if (player.wall && typeof player.wall === 'string') {
                                player.wall = JSON.parse(player.wall);
                            }
                        });
                    }
                } catch(e) {
                    console.error("Error parsing state from Firestore:", e);
                    return;
                }
                
                callback(receivedState);
            } else {
                callback(null);
            }
        }, (error) => {
            console.error("Error with Firestore snapshot listener:", error);
        });
    }

    async updateGameState(gameState) {
        if (!this.gameDocRef) return;
        try {
            const stateToSave = JSON.parse(JSON.stringify(gameState));

            stateToSave.players.forEach(player => {
                if (Array.isArray(player.wall)) {
                    player.wall = JSON.stringify(player.wall);
                }
            });
            if (Array.isArray(stateToSave.factories)) {
                stateToSave.factories = JSON.stringify(stateToSave.factories);
            }

            await setDoc(this.gameDocRef, stateToSave);
        } catch (error) {
            console.error("Error updating Firestore:", error);
        }
    }

    getUserId() {
        return this.userId;
    }

    getGameId() {
        return this.gameId;
    }

    unsubscribe() {
        if (this.gameStateUnsubscribe) {
            this.gameStateUnsubscribe();
        }
    }
}

export default FirebaseService;
