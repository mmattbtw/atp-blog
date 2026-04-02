globalThis.process ??= {}; globalThis.process.env ??= {};
import { g as getCarRecords } from '../../chunks/api_yjVozGB8.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_C0jZesLU.mjs';

const GET = async ({ url }) => {
  const cursor = url.searchParams.get("cursor") || void 0;
  try {
    const result = await getCarRecords(cursor);
    return Response.json({
      records: result.records.map((record) => ({
        createdAt: record.value.createdAt,
        carFuelRange: record.value.carFuelRange,
        carPercentFuelRemaining: record.value.carPercentFuelRemaining,
        amountRemaining: record.value.amountRemaining,
        carTraveledDistance: record.value.carTraveledDistance
      })),
      cursor: result.cursor
    });
  } catch (error) {
    console.error("Error fetching car records:", error);
    return Response.json(
      { error: "Failed to fetch car records" },
      { status: 500 }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
