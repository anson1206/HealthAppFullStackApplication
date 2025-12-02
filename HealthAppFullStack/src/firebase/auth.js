import { auth } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updatePassword, sendEmailVerification } from "firebase/auth";


export const doCreateUserWithEmailAndPassword = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);

}

export const doSignInWithEmailAndPassword = async (email, password) =>{
    return signInWithEmailAndPassword(auth, email, password);
}

export const doSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth,provider);
    //result.user
    return result;
}

export const doSignOut = () =>{
    return auth.signOut();
}

export const doPasswordReset = (email) => {
    return auth.sendPasswordResetEmail(email);
}

export const doPassWordChange = (password) =>{
    return updatePassword(auth.currentUser, password);
}

export const doSendEmailVerification = () => {
    return sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/login`,
    });
}