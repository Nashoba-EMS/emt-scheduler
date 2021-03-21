import { Schedule, ScheduleAvailability } from "./types/schedule";
import { UserWithoutPassword } from "./types/user";
import { buildSchedule } from "./schedule";

const initialSchedule: Schedule = {
  _id: "schedule-id",
  name: "Test Schedule",
  startDate: "2020-03-01",
  endDate: "2020-03-31",
  assignments: [],
};

const users: UserWithoutPassword[] = [];

const availability: ScheduleAvailability[] = [];

console.log(buildSchedule(initialSchedule, users, availability));
