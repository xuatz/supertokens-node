import { APIInterface } from "../";
import Session from "../../session";

export default function getAPIImplementation(): APIInterface {
    return {
        consumeCodePOST: async function (input) {
            let response = await input.options.recipeImplementation.consumeCode(
                "deviceId" in input
                    ? {
                          preAuthSessionId: input.preAuthSessionId,
                          deviceId: input.deviceId,
                          userInputCode: input.userInputCode,
                          userContext: input.userContext,
                      }
                    : {
                          preAuthSessionId: input.preAuthSessionId,
                          linkCode: input.linkCode,
                          userContext: input.userContext,
                      }
            );

            if (response.status !== "OK") {
                return response;
            }

            let user = response.user;

            const session = await Session.createNewSession(input.options.res, user.id, {}, {});
            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: response.user,
                session,
            };
        },
        createCodePOST: async function (input) {
            let response = await input.options.recipeImplementation.createCode(
                "email" in input
                    ? {
                          userContext: input.userContext,
                          email: input.email,
                          userInputCode:
                              input.options.config.getCustomUserInputCode === undefined
                                  ? undefined
                                  : await input.options.config.getCustomUserInputCode(input.userContext),
                      }
                    : {
                          userContext: input.userContext,
                          phoneNumber: input.phoneNumber,
                          userInputCode:
                              input.options.config.getCustomUserInputCode === undefined
                                  ? undefined
                                  : await input.options.config.getCustomUserInputCode(input.userContext),
                      }
            );

            // now we send the email / text message.
            let magicLink: string | undefined = undefined;
            let userInputCode: string | undefined = undefined;
            const flowType = input.options.config.flowType;
            if (flowType === "MAGIC_LINK" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                magicLink =
                    (await input.options.config.getLinkDomainAndPath(
                        "phoneNumber" in input
                            ? {
                                  phoneNumber: input.phoneNumber!,
                              }
                            : {
                                  email: input.email,
                              },
                        input.userContext
                    )) +
                    "?rid=" +
                    input.options.recipeId +
                    "&preAuthSessionId=" +
                    response.preAuthSessionId +
                    "#" +
                    response.linkCode;
            }
            if (flowType === "USER_INPUT_CODE" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                userInputCode = response.userInputCode;
            }

            try {
                // we don't do something special for serverless env here
                // cause we want to wait for service's reply since it can show
                // a UI error message for if sending an SMS / email failed or not.
                if (
                    input.options.config.contactMethod === "PHONE" ||
                    (input.options.config.contactMethod === "EMAIL_OR_PHONE" && "phoneNumber" in input)
                ) {
                    await input.options.config.createAndSendCustomTextMessage(
                        {
                            codeLifetime: response.codeLifetime,
                            phoneNumber: (input as any).phoneNumber!,
                            preAuthSessionId: response.preAuthSessionId,
                            urlWithLinkCode: magicLink,
                            userInputCode,
                        },
                        input.userContext
                    );
                } else {
                    await input.options.config.createAndSendCustomEmail(
                        {
                            codeLifetime: response.codeLifetime,
                            email: (input as any).email!,
                            preAuthSessionId: response.preAuthSessionId,
                            urlWithLinkCode: magicLink,
                            userInputCode,
                        },
                        input.userContext
                    );
                }
            } catch (err) {
                return {
                    status: "GENERAL_ERROR",
                    message: (err as any).message,
                };
            }

            return {
                status: "OK",
                deviceId: response.deviceId,
                flowType: input.options.config.flowType,
                preAuthSessionId: response.preAuthSessionId,
            };
        },
        emailExistsGET: async function (input) {
            let response = await input.options.recipeImplementation.getUserByEmail({
                userContext: input.userContext,
                email: input.email,
            });

            return {
                exists: response !== undefined,
                status: "OK",
            };
        },
        phoneNumberExistsGET: async function (input) {
            let response = await input.options.recipeImplementation.getUserByPhoneNumber({
                userContext: input.userContext,
                phoneNumber: input.phoneNumber,
            });

            return {
                exists: response !== undefined,
                status: "OK",
            };
        },
        resendCodePOST: async function (input) {
            let deviceInfo = await input.options.recipeImplementation.listCodesByDeviceId({
                userContext: input.userContext,
                deviceId: input.deviceId,
            });

            if (deviceInfo === undefined) {
                return {
                    status: "RESTART_FLOW_ERROR",
                };
            }

            if (
                (input.options.config.contactMethod === "PHONE" && deviceInfo.phoneNumber === undefined) ||
                (input.options.config.contactMethod === "EMAIL" && deviceInfo.email === undefined)
            ) {
                return {
                    status: "RESTART_FLOW_ERROR",
                };
            }

            let numberOfTriesToCreateNewCode = 0;
            while (true) {
                numberOfTriesToCreateNewCode++;
                let response = await input.options.recipeImplementation.createNewCodeForDevice({
                    userContext: input.userContext,
                    deviceId: input.deviceId,
                    userInputCode:
                        input.options.config.getCustomUserInputCode === undefined
                            ? undefined
                            : await input.options.config.getCustomUserInputCode(input.userContext),
                });

                if (response.status === "USER_INPUT_CODE_ALREADY_USED_ERROR") {
                    if (numberOfTriesToCreateNewCode >= 3) {
                        // we retry 3 times.
                        return {
                            status: "GENERAL_ERROR",
                            message: "Failed to generate a one time code. Please try again",
                        };
                    }
                    continue;
                }

                if (response.status === "OK") {
                    let magicLink: string | undefined = undefined;
                    let userInputCode: string | undefined = undefined;
                    const flowType = input.options.config.flowType;
                    if (flowType === "MAGIC_LINK" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                        magicLink =
                            (await input.options.config.getLinkDomainAndPath(
                                deviceInfo.email === undefined
                                    ? {
                                          phoneNumber: deviceInfo.phoneNumber!,
                                      }
                                    : {
                                          email: deviceInfo.email,
                                      },
                                input.userContext
                            )) +
                            "?rid=" +
                            input.options.recipeId +
                            "&preAuthSessionId=" +
                            response.preAuthSessionId +
                            "#" +
                            response.linkCode;
                    }
                    if (flowType === "USER_INPUT_CODE" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                        userInputCode = response.userInputCode;
                    }

                    try {
                        // we don't do something special for serverless env here
                        // cause we want to wait for service's reply since it can show
                        // a UI error message for if sending an SMS / email failed or not.
                        if (
                            input.options.config.contactMethod === "PHONE" ||
                            (input.options.config.contactMethod === "EMAIL_OR_PHONE" &&
                                deviceInfo.phoneNumber !== undefined)
                        ) {
                            await input.options.config.createAndSendCustomTextMessage(
                                {
                                    codeLifetime: response.codeLifetime,
                                    phoneNumber: deviceInfo.phoneNumber!,
                                    preAuthSessionId: response.preAuthSessionId,
                                    urlWithLinkCode: magicLink,
                                    userInputCode,
                                },
                                input.userContext
                            );
                        } else {
                            await input.options.config.createAndSendCustomEmail(
                                {
                                    codeLifetime: response.codeLifetime,
                                    email: deviceInfo.email!,
                                    preAuthSessionId: response.preAuthSessionId,
                                    urlWithLinkCode: magicLink,
                                    userInputCode,
                                },
                                input.userContext
                            );
                        }
                    } catch (err) {
                        return {
                            status: "GENERAL_ERROR",
                            message: (err as any).message,
                        };
                    }
                }

                return {
                    status: response.status,
                };
            }
        },
    };
}
