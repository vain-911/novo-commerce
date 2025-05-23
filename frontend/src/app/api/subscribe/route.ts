import { NextRequest, NextResponse } from "next/server";
import EventSource from "eventsource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:9000";

export async function GET(req: NextRequest, res: NextResponse) {
  let responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const restaurantId = req.nextUrl.searchParams.get("restaurant_id");
  const driverId = req.nextUrl.searchParams.get("driver_id");
  const deliveryId = req.nextUrl.searchParams.get("delivery_id");

  let serverUrl = BACKEND_URL + "/store/deliveries/subscribe";

  if (restaurantId) {
    serverUrl += `?restaurant_id=${restaurantId}`;
    writer.write(
      encoder.encode(
        "data: " +
          JSON.stringify({
            message: "Subscribing to restaurant " + restaurantId,
          }) +
          "\n\n"
      )
    );
  }

  if (driverId) {
    serverUrl += `?driver_id=${driverId}`;
    writer.write(
      encoder.encode(
        "data: " +
          JSON.stringify({ message: "Subscribing to driver " + driverId }) +
          "\n\n"
      )
    );
  }

  if (deliveryId) {
    serverUrl += `?delivery_id=${deliveryId}`;
    writer.write(
      encoder.encode(
        "data: " +
          JSON.stringify({ message: "Subscribing to delivery " + deliveryId }) +
          "\n\n"
      )
    );
  }

  const source = new EventSource(serverUrl, {
    headers: {
      "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    },
  });

  source.onmessage = (message: Record<string, any>) => {
    writer.write(encoder.encode("data: " + message.data + "\n\n"));
  };

  source.onerror = (error) => {
    writer.write(
      encoder.encode(`event: error\ndata: ${JSON.stringify(error)}\n\n`)
    );
    source.close();
    writer.close();
  };

  req.signal.onabort = () => {
    source.close();
    writer.close();
  };

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
