import { NextRequest, NextResponse } from "next/server";

import { getCarRecords } from "#/lib/api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cursor = searchParams.get("cursor") || undefined;

  try {
    const result = await getCarRecords(cursor);

    return NextResponse.json({
      records: result.records.map((r) => ({
        createdAt: r.value.createdAt,
        carFuelRange: r.value.carFuelRange,
        carPercentFuelRemaining: r.value.carPercentFuelRemaining,
        amountRemaining: r.value.amountRemaining,
        carTraveledDistance: r.value.carTraveledDistance,
      })),
      cursor: result.cursor,
    });
  } catch (error) {
    console.error("Error fetching car records:", error);
    return NextResponse.json(
      { error: "Failed to fetch car records" },
      { status: 500 },
    );
  }
}
