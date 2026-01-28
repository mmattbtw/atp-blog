export function GET() {
  return new Response("did:plc:tas6hj2xjrqben5653v5kohk", {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
