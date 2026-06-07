import { createServerFn } from "@tanstack/react-start";
import { issueChallenge } from "./human-challenge.server";

export const issueHumanChallenge = createServerFn({ method: "POST" }).handler(async () => {
  return issueChallenge();
});
