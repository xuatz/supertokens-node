// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, User, APIInterface, APIOptions, TypeProvider } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static signInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ): Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
          }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    >;
    static getUserById(userId: string): Promise<User | undefined>;
    static getUsersByEmail(email: string): Promise<User[]>;
    static getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined>;
    static createEmailVerificationToken(
        userId: string
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "EMAIL_ALREADY_VERIFIED_ERROR";
          }
    >;
    static verifyEmailUsingToken(
        token: string
    ): Promise<
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
        | User
        | undefined
    >;
    static isEmailVerified(userId: string): Promise<boolean>;
    static revokeEmailVerificationTokens(
        userId: string
    ): Promise<{
        status: "OK";
    }>;
    static unverifyEmail(
        userId: string
    ): Promise<{
        status: "OK";
    }>;
    static Google: typeof import("./providers/google").default;
    static Github: typeof import("./providers/github").default;
    static Facebook: typeof import("./providers/facebook").default;
    static Apple: typeof import("./providers/apple").default;
    static Discord: typeof import("./providers/discord").default;
    static GoogleWorkspaces: typeof import("./providers/googleWorkspaces").default;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let signInUp: typeof Wrapper.signInUp;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUsersByEmail: typeof Wrapper.getUsersByEmail;
export declare let getUserByThirdPartyInfo: typeof Wrapper.getUserByThirdPartyInfo;
export declare let createEmailVerificationToken: typeof Wrapper.createEmailVerificationToken;
export declare let verifyEmailUsingToken: typeof Wrapper.verifyEmailUsingToken;
export declare let isEmailVerified: typeof Wrapper.isEmailVerified;
export declare let revokeEmailVerificationTokens: typeof Wrapper.revokeEmailVerificationTokens;
export declare let unverifyEmail: typeof Wrapper.unverifyEmail;
export declare let Google: typeof import("./providers/google").default;
export declare let Github: typeof import("./providers/github").default;
export declare let Facebook: typeof import("./providers/facebook").default;
export declare let Apple: typeof import("./providers/apple").default;
export declare let Discord: typeof import("./providers/discord").default;
export declare let GoogleWorkspaces: typeof import("./providers/googleWorkspaces").default;
export type { RecipeInterface, User, APIInterface, APIOptions, TypeProvider };
