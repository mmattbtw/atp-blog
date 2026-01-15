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

namespace net.mmatt.vitals.rings {
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

    /** The heart rate value */
    @required
    heartRate: integer;
  }
}

namespace net.mmatt.vitals.phone {
  @rec("tid")
  model Main {
    /** The unix timestamp of when the vital was recorded */
    @required
    createdAt: datetime;
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
  }
}

namespace net.mmatt.vitals.car {
  @rec("tid")
  model Main {
    /** The unix timestamp of when the vital was recorded */
    @required
    createdAt: datetime;
    /** The car fuel range value in miles */
    @required
    carFuelRange: integer;
    /** The car fuel level value in percentage (floating point string) */
    @required
    carPercentFuelRemaining: string;
    /** The car fuel amount remaining value (floating point string) */
    @required
    amountRemaining: string;
    /** The car traveled distance value */
    @required
    carTraveledDistance: integer;

    /** The car make value */
    carMake?: string;
    /** The car model value */
    carModel?: string;
    /** The car year value */
    carYear?: integer;
  }
}