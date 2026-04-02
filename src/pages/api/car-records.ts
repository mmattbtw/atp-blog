import type { APIRoute } from "astro";

import { getCarRecords } from "#/lib/api";

export const GET: APIRoute = async ({ url }) => {
  const cursor = url.searchParams.get("cursor") || undefined;

  try {
    const result = await getCarRecords(cursor);

    return Response.json({
      records: result.records.map((record) => ({
        createdAt: record.value.createdAt,
        carFuelRange: record.value.carFuelRange,
        carPercentFuelRemaining: record.value.carPercentFuelRemaining,
        amountRemaining: record.value.amountRemaining,
        carTraveledDistance: record.value.carTraveledDistance,
      })),
      cursor: result.cursor,
    });
  } catch (error) {
    console.error("Error fetching car records:", error);
    return Response.json(
      { error: "Failed to fetch car records" },
      { status: 500 },
    );
  }
};
