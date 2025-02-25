/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
import { ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY } from "./constants";
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";

export async function addJWTToAccessTokenPayload({
    accessTokenPayload,
    jwtExpiry,
    userId,
    jwtPropertyName,
    openIdRecipeImplementation,
}: {
    accessTokenPayload: any;
    jwtExpiry: number;
    userId: string;
    jwtPropertyName: string;
    openIdRecipeImplementation: OpenIdRecipeInterface;
}): Promise<any> {
    // If jwtPropertyName is not undefined it means that the JWT was added to the access token payload already
    let existingJwtPropertyName = accessTokenPayload[ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];

    if (existingJwtPropertyName !== undefined) {
        // Delete the old JWT and the old property name
        delete accessTokenPayload[existingJwtPropertyName];
        delete accessTokenPayload[ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY];
    }

    // Create the JWT
    let jwtResponse = await openIdRecipeImplementation.createJWT({
        payload: {
            /* 
                We add our claims before the user provided ones so that if they use the same claims
                then the final payload will use the values they provide
            */
            sub: userId,
            ...accessTokenPayload,
        },
        validitySeconds: jwtExpiry,
    });

    if (jwtResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
        // Should never come here
        throw new Error("JWT Signing algorithm not supported");
    }

    // Add the jwt and the property name to the access token payload
    accessTokenPayload = {
        ...accessTokenPayload,
        /*
            We add the JWT after the user defined keys because we want to make sure that it never
            gets overwritten by a user defined key. Using the same key as the one configured (or defaulting)
            for the JWT should be considered a dev error

            ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY indicates a reserved key used to determine the property name
            with which the JWT is set, used to retrieve the JWT from the access token payload during refresg and
            updateAccessTokenPayload

            Note: If the user has multiple overrides each with a unique propertyNameInAccessTokenPayload, the logic
            for checking the existing JWT when refreshing the session or updating the access token payload will not work.
            This is because even though the jwt itself would be created with unique property names, the _jwtPName value would
            always be overwritten by the override that runs last and when retrieving the jwt using that key name it cannot be 
            guaranteed that the right JWT is returned. This case is considered to be a rare requirement and we assume
            that users will not need multiple JWT representations of their access token payload.
        */
        [jwtPropertyName]: jwtResponse.jwt,
        [ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY]: jwtPropertyName,
    };

    return accessTokenPayload;
}
