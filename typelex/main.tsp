import "@typelex/emitter";

namespace net.mmatt.right.now {
  /** A personal lexicon for mmatt's statuslog. */
  @rec("tid")
  model Main {
    /** The unix timestamp of when the status was recorded */
    @required
    createdAt: datetime;
    /** The text of the status update */
    @required
    text: string;
    /** The emoji of the status update */
    emoji?: string;
  }
}

namespace net.mmatt.personal.vitals {
  @rec("tid")
  model Main {
    /** The unix timestamp of when the vital was recorded */
    @required
    createdAt: datetime;
  
    /** The move ring value */
    @required
    ringsMove: integer;
    /** The exercise ring value */
    @required
    ringsExercise: integer;
    /** The stand hours ring value */
    @required
    ringsStandHours: integer;

    /** The move goal ring value */
    @required
    ringsMoveGoal: integer;
    /** The exercise goal ring value */
    @required
    ringsExerciseGoal: integer;
    /** The stand hours goal ring value */
    @required
    ringsStandHoursGoal: integer;

    /** The steps value */
    @required
    ringsSteps: integer;
    /** The burned calories value */
    @required
    ringsBurnedCalories: integer;

    /** The phone motion value */
    @required
    phoneMotion: string;
    /** The phone volume value */
    @required
    phoneVolume: string;
    /** The phone appearance value */
    @required
    phoneAppearance: string;
    /** The phone brightness value */
    @required
    phoneBrightness: string;
    /** The phone orientation value */
    @required
    phoneOrientation: string;
    /** The phone cell bars value */
    @required
    phoneCellBars: string;
    /** The phone cell network value */
    @required
    phoneCellNetwork: string;
    /** The phone battery level value */
    @required
    phoneBatteryLevel: string;
    /** The phone battery charging value */
    @required
    phoneBatteryCharging: string;
    /** The phone OS value */
    @required
    phoneOs: string;
    /** The phone OS version value */
    @required
    phoneOsVersion: string;
    /** The phone model value */
    @required
    phoneModel: string;

    /** The car fuel level value */
    @required
    carFuelLevel: integer;
    /** The car traveled distance value */
    @required
    carTraveledDistance: integer;
  }
}