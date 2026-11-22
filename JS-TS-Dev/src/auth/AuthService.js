
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";

import { auth } from "./Firebase.js";

class AuthService {

    async signup(email, password) {
        try {
            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            return {
                success: true,
                user: userCredential.user
            };

        } catch (error) {
            return {
                success: false,
                message: this.getErrorMessage(error.code)
            };
        }
    }

    async login(email, password) {
        try {
            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            return {
                success: true,
                user: userCredential.user
            };

        } catch (error) {
            return {
                success: false,
                message: this.getErrorMessage(error.code)
            };
        }
    }

    async logout() {
        try {
            await signOut(auth);
            return { success: true };

        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    getErrorMessage(errorCode) {
        const errors = {
            "auth/email-already-in-use":
                "This email is already registered.",

            "auth/invalid-email":
                "Please enter a valid email address.",

            "auth/weak-password":
                "Password should contain at least 6 characters.",

            "auth/invalid-credential":
                "Invalid email or password.",

            "auth/network-request-failed":
                "Network connection failed. Please try again."
        };

        return errors[errorCode] || "Authentication failed. Please try again.";
    }
}

export default new AuthService();
