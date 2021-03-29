import moment from "moment";

import { Schedule } from "./types/schedule.d";

/**
 * Check if a day is valid for a given schedule (must be a weekday)
 */
export const isDayValid = (schedule: Schedule, date: string | Date) => {
  const dateMoment = moment(date);
  const dayOfWeek = dateMoment.day();

  return (
    dateMoment.isBetween(schedule.startDate, schedule.endDate, "day", "[]") &&
    dayOfWeek !== 0 &&
    dayOfWeek !== 6
  );
};

/**
 * Get all the valid days in a given schedule
 */
export const getDaysInSchedule = (schedule: Schedule) => {
  const days: string[] = [];

  const currentMoment = moment(schedule.startDate);
  const endMoment = moment(schedule.endDate);

  while (currentMoment.isSameOrBefore(endMoment)) {
    if (isDayValid(schedule, currentMoment.toDate())) {
      days.push(currentMoment.format("YYYY-MM-DD"));
    }

    currentMoment.add(1, "days");
  }

  return days;
};
