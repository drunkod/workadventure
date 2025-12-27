
import "dotenv/config";
import { PUSHER_URL, FRONT_ENVIRONMENT_VARIABLES } from "./EnvironmentVariable";

console.log("DEBUG: PUSHER_URL from EnvironmentVariable:", PUSHER_URL);
console.log("DEBUG: FRONT_ENVIRONMENT_VARIABLES.PUSHER_URL:", FRONT_ENVIRONMENT_VARIABLES.PUSHER_URL);
console.log("DEBUG: process.env.PUSHER_URL:", process.env.PUSHER_URL);
