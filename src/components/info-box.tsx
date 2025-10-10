import { bsky } from "#/lib/bsky";
import { env } from "#/lib/env";

import { Record } from "../../lexiconTypes/types/net/mmatt/vitals/car";

export default async function InfoBox() {
  const cars = await bsky.get("com.atproto.repo.listRecords", {
    params: {
      repo: env.NEXT_PUBLIC_BSKY_DID,
      collection: "net.mmatt.vitals.car",
      limit: 1,
    },
  });
  const carInfo = cars.data.records[0].value as Record;
  return (
    <div className="flex flex-col dark:border-white border-black border-2 rounded-lg p-4">
      <h2 className="text-lg font-bold">Car Info</h2>
      <p>Fuel Range: {carInfo.carFuelRange}</p>
      <p>Fuel Level: {carInfo.carPercentFuelRemaining}</p>
      <p>Amount Remaining: {carInfo.amountRemaining}</p>
      <p>Traveled Distance: {carInfo.carTraveledDistance}</p>
    </div>
  );
}
