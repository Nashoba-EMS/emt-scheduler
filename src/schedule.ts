import { Schedule, ScheduleAvailability, ScheduleDay } from "./types/schedule";
import { UserWithoutPassword } from "./types/user";
import { getDaysInSchedule } from "./datetime";
import { shuffle } from "./shuffle";

/**
 * Build a valid schedule based on availability and crew requirements
 */
export const buildSchedule = (
  schedule: Schedule,
  users: UserWithoutPassword[],
  userAvailability: ScheduleAvailability[]
): Schedule => {
  // Build maps to quickly look up users and availability by user ID
  const userIdToUser: {
    [_id: string]: UserWithoutPassword | undefined;
  } = {};
  const userIdToAvailability: {
    [_id: string]: ScheduleAvailability | undefined;
  } = {};

  users = shuffle(users.filter((user) => user.eligible));

  users.forEach((user) => (userIdToUser[user._id] = user));
  userAvailability.forEach(
    (availability) =>
      (userIdToAvailability[availability.user_id] = availability)
  );

  const days = getDaysInSchedule(schedule);

  const dayToCadetIds: {
    [date: string]: ScheduleDay["cadet_ids"] | undefined;
  } = {};
  const cadetIdToDays: {
    [_id: string]: string[] | undefined;
  } = {};

  const crewChiefs = users.filter((user) => user.chief);
  const certifieds = users.filter((user) => user.certified && !user.chief);
  const nonChiefs = users.filter((user) => !user.chief);

  const isCadetAvailable = (day: string, id: string) => {
    return userIdToAvailability[id]?.days.includes(day);
  };

  const isCadetAssigned = (day: string, id: string) => {
    return dayToCadetIds[day]?.includes(id);
  };

  const canAssignCadet = (day: string, id: string) => {
    return isCadetAvailable(day, id) && !isCadetAssigned(day, id);
  };

  /**
   * Rotate over given cadets and add first available to day
   */
  const addCadets = (cadets: UserWithoutPassword[]) => {
    const used = new Set();

    /**
     * Add a cadet and remember they were added
     */
    const addCadet = (day: string, cadet: UserWithoutPassword) => {
      if (dayToCadetIds[day]) {
        dayToCadetIds[day]?.push(cadet._id);
      } else {
        dayToCadetIds[day] = [cadet._id];
      }

      if (cadetIdToDays[cadet._id]) {
        cadetIdToDays[cadet._id]?.push(day);
      } else {
        cadetIdToDays[cadet._id] = [day];
      }

      used.add(cadet._id);

      if (used.size === cadets.length) {
        used.clear();
      }
    };

    days.forEach((day) => {
      // Try to add a cadet who hasn't been added recently
      for (const cadet of cadets) {
        if (!used.has(cadet._id) && canAssignCadet(day, cadet._id)) {
          addCadet(day, cadet);
          return;
        }
      }

      // If no cadet added, add first one found
      for (const cadet of cadets) {
        if (canAssignCadet(day, cadet._id)) {
          addCadet(day, cadet);
          break;
        }
      }
    });
  };

  const replaceCadet = (day: string, oldId: string, newId: string) => {
    cadetIdToDays[oldId] = cadetIdToDays[oldId]?.filter(
      (thisDay) => day !== thisDay
    );
    dayToCadetIds[day] = dayToCadetIds[day]?.filter((_id) => _id !== oldId);

    dayToCadetIds[day]?.push(newId);

    if (cadetIdToDays[newId]) {
      cadetIdToDays[newId]?.push(day);
    } else {
      cadetIdToDays[newId] = [day];
    }
  };

  const isGenderBalanced = (day: string) => {
    let males = 0;
    let females = 0;

    dayToCadetIds[day]?.forEach((id) => {
      const gender = userIdToUser[id]?.gender;

      if (gender === "M") {
        males++;
      } else if (gender === "F") {
        females++;
      }
    });

    return { balanced: males > 0 && females > 0, males, females };
  };

  const isScheduleBalanced = () => {
    for (const day of days) {
      const availableCadets = nonChiefs.filter((cadet) =>
        isCadetAvailable(day, cadet._id)
      );
      const numberOfCertifieds =
        dayToCadetIds[day]
          ?.map((cadetId) => userIdToUser[cadetId])
          .filter((cadet) => !cadet?.chief && cadet?.certified).length ?? 0;

      let lowestCadetId = "";
      let lowestCadetDays = Infinity;

      let highestCadetId = "";
      let highestCadetDays = 0;

      availableCadets.forEach((cadet) => {
        const thisCadetDays = cadetIdToDays[cadet._id]?.length ?? 0;
        const modifier = cadet.certified ? 1 : 0;

        if (
          thisCadetDays - modifier < lowestCadetDays &&
          !isCadetAssigned(day, cadet._id)
        ) {
          lowestCadetId = cadet._id;
          lowestCadetDays = thisCadetDays - modifier;
        }

        if (
          thisCadetDays - modifier > highestCadetDays &&
          isCadetAssigned(day, cadet._id)
        ) {
          highestCadetId = cadet._id;
          highestCadetDays = thisCadetDays - modifier;
        }
      });

      if (highestCadetDays - lowestCadetDays >= 2 && numberOfCertifieds > 1) {
        console.log(`${day} is not cadet balanced`, {
          day,
          highestUser: userIdToUser[highestCadetId]?.name,
          lowestUser: userIdToUser[lowestCadetId]?.name,
          highestCadetDays,
          lowestCadetDays,
        });
        return false;
      }
    }

    for (const day of days) {
      if (!isGenderBalanced(day).balanced) {
        console.log(`${day} is not gender balanced`);
        return false;
      }
    }
    return true;
  };

  // Add a chief to every day
  addCadets(crewChiefs);

  // Balance the chiefs' days
  const balanceChiefs = () => {
    days.forEach((day) => {
      const availableChiefs = crewChiefs.filter((cadet) =>
        isCadetAvailable(day, cadet._id)
      );
      const currentChiefId = dayToCadetIds[day]?.[0] ?? "";
      const currentChiefDays = cadetIdToDays[currentChiefId]?.length ?? 0;

      let lowestChiefId = "";
      let lowestChiefDays = Infinity;
      availableChiefs.forEach((cadet) => {
        if (currentChiefId === cadet._id) {
          return;
        }

        const thisChiefDays = cadetIdToDays[cadet._id]?.length ?? 0;

        if (thisChiefDays < lowestChiefDays) {
          lowestChiefId = cadet._id;
          lowestChiefDays = thisChiefDays;
        }
      });

      if (currentChiefDays - lowestChiefDays >= 2) {
        replaceCadet(day, currentChiefId, lowestChiefId);
      }
    });
  };

  balanceChiefs();
  balanceChiefs();

  // Add a certified to every day
  addCadets(certifieds);

  // Add a nonChief to every day, twice
  addCadets(nonChiefs);
  addCadets(nonChiefs);

  let i = 0;
  while (!isScheduleBalanced()) {
    for (const day of days) {
      const availableCadets = shuffle(
        nonChiefs.filter((cadet) => isCadetAvailable(day, cadet._id))
      );

      let numberOfCertifieds =
        dayToCadetIds[day]
          ?.map((cadetId) => userIdToUser[cadetId])
          .filter((cadet) => !cadet?.chief && cadet?.certified).length ?? 0;

      let lowestCadetId = "";
      let lowestCadetDays = Infinity;

      let highestCadetId = "";
      let highestCadetDays = -1;

      availableCadets.forEach((cadet) => {
        const thisCadetDays = cadetIdToDays[cadet._id]?.length ?? 0;
        const modifier = cadet.certified ? 1 : 0;

        if (
          thisCadetDays - modifier < lowestCadetDays &&
          !isCadetAssigned(day, cadet._id)
        ) {
          lowestCadetId = cadet._id;
          lowestCadetDays = thisCadetDays - modifier;
        }

        if (
          thisCadetDays > highestCadetDays &&
          isCadetAssigned(day, cadet._id)
        ) {
          highestCadetId = cadet._id;
          highestCadetDays = thisCadetDays;
        }
      });

      if (
        highestCadetDays > -1 &&
        lowestCadetDays < Infinity &&
        highestCadetDays - lowestCadetDays >= 2 &&
        (!userIdToUser[highestCadetId]?.certified ||
          numberOfCertifieds > 1 ||
          userIdToUser[lowestCadetId]?.certified)
      ) {
        console.log({
          day,
          highestUser: userIdToUser[highestCadetId]?.name,
          lowestUser: userIdToUser[lowestCadetId]?.name,
          highestCadetDays,
          lowestCadetDays,
        });
        replaceCadet(day, highestCadetId, lowestCadetId);
      }

      numberOfCertifieds =
        dayToCadetIds[day]
          ?.map((cadetId) => userIdToUser[cadetId])
          .filter((cadet) => !cadet?.chief && cadet?.certified).length ?? 0;

      const genderBalance = isGenderBalanced(day);
      if (!genderBalance.balanced) {
        const newGender =
          genderBalance.males > genderBalance.females ? "F" : "M";
        const newGenderAvailableCadets = availableCadets.filter(
          (cadet) => cadet.gender === newGender && !cadet.chief
        );

        let lowestNewGenderCadetId = "";
        let lowestNewGenderCadetDays = Infinity;

        newGenderAvailableCadets.forEach((cadet) => {
          const thisCadetDays = cadetIdToDays[cadet._id]?.length ?? 0;

          if (
            thisCadetDays < lowestNewGenderCadetDays &&
            ((numberOfCertifieds > 1 && !cadet.certified) ||
              (numberOfCertifieds === 1 && cadet.certified))
          ) {
            lowestNewGenderCadetId = cadet._id;
            lowestNewGenderCadetDays = thisCadetDays;
          }
        });

        let highestOldGenderCadetId = "";
        let highestOldGenderCadetDays = -1;

        dayToCadetIds[day]
          ?.map((cadetId) => userIdToUser[cadetId])
          .filter((cadet) => !cadet?.chief)
          .forEach((cadet) => {
            if (!cadet) return;

            const thisCadetDays = cadetIdToDays[cadet._id]?.length ?? 0;

            if (
              thisCadetDays > highestOldGenderCadetDays &&
              (numberOfCertifieds > 1 || !cadet.certified)
            ) {
              highestOldGenderCadetId = cadet._id;
              highestOldGenderCadetDays = thisCadetDays;
            }
          });

        if (
          lowestNewGenderCadetDays < Infinity &&
          highestOldGenderCadetDays > -1
        ) {
          replaceCadet(day, highestOldGenderCadetId, lowestNewGenderCadetId);
        }
      }
    }

    console.log(i);

    i++;
    if (i >= 10) break;
  }

  console.log(isScheduleBalanced());

  return {
    ...schedule,
    assignments: days.map((day) => {
      const cadets = dayToCadetIds[day]?.map(
        (cadetId) => userIdToUser[cadetId]
      );
      const chiefCadets = cadets?.filter((cadet) => cadet?.chief) ?? [];
      const certCadets =
        cadets?.filter((cadet) => cadet?.certified && !cadet?.chief) ?? [];
      const uncertCadets =
        cadets?.filter((cadet) => !cadet?.certified && !cadet?.chief) ?? [];
      const cadet_ids = [...chiefCadets, ...certCadets, ...uncertCadets].map(
        (cadet) => cadet?._id ?? ""
      );

      return {
        date: day,
        cadet_ids,
      };
    }),
  };
};
