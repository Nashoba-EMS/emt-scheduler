import { Schedule, ScheduleAvailability } from "./types/schedule";
import { UserWithoutPassword } from "./types/user";

/**
 * Build a valid schedule based on availability and crew requirements
 */
export const buildSchedule = (
  schedule: Schedule,
  users: UserWithoutPassword[],
  availability: ScheduleAvailability[]
): Schedule => {
  throw new Error("Not implemented");
};
