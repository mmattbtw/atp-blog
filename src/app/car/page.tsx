import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import NextLink from "next/link";

import { Paragraph, Title } from "#/components/typography";
import { getCarRecords } from "#/lib/api";

import { CarStatsClient } from "./car-stats-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://mmatt.net"),
  title: "my car - mmatt.net",
  description: "various statistics about my car and how I drive.",
  other: {
    "fediverse:creator": "@matt@social.lol",
  },
};

export default async function CarStatsPage() {
  const { records: carRecords, cursor } = await getCarRecords();

  // Sort by date, oldest first for charts
  const sortedRecords = [...carRecords].sort(
    (a, b) =>
      new Date(a.value.createdAt).getTime() -
      new Date(b.value.createdAt).getTime(),
  );

  const latestRecord = carRecords[0]?.value;

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-dvh p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-4xl">
        <NextLink
          href="/"
          className="hover:underline hover:underline-offset-4 font-medium"
        >
          <ArrowLeftIcon className="inline size-4 align-middle mb-px mr-1" />
          Back
        </NextLink>

        <div className="w-full">
          <Title level="h1">Car Stats</Title>
          {latestRecord && (
            <div className="mt-4 p-4 border rounded-lg bg-white/5">
              <p className="text-2xl font-bold">
                {latestRecord.carYear} {latestRecord.carMake}{" "}
                {latestRecord.carModel}
              </p>
            </div>
          )}
        </div>

        <div className="w-full bg-yellow-200/50 p-4 border rounded-lg border-yellow-300">
          <Title level="h2" className="mb-2">
            ⚠️ Stats aren&apos;t updating right now. :(
          </Title>
          <Paragraph>
            There is an{" "}
            <a
              href="https://brandreliability.smartcar.com/incidents/f1ffrg7ndlt7"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              upstream issue with Smartcar&apos;s API
            </a>{" "}
            that currently has an outage{" "}
            <span className="italic">specifically</span> affecting Nissan
            vehicles. :,(
          </Paragraph>
        </div>

        <CarStatsClient
          initialRecords={sortedRecords.map((r) => ({
            createdAt: r.value.createdAt,
            carFuelRange: r.value.carFuelRange,
            carPercentFuelRemaining: r.value.carPercentFuelRemaining,
            amountRemaining: r.value.amountRemaining,
            carTraveledDistance: r.value.carTraveledDistance,
          }))}
          initialCursor={cursor}
        />
      </main>
    </div>
  );
}
