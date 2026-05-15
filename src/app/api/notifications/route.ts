import { NextResponse } from "next/server";
import {
  listUserNotifications,
  markUserNotificationsRead,
} from "@/features/community/notifications";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import {
  parseJsonObjectBody,
  readOptionalBoolean,
  readOptionalString,
  validationErrorResponse,
} from "@/lib/input-validation";

export async function GET(request: Request) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "notifications",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const result = await listUserNotifications(userId, 20);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { message: "Falha ao carregar notificações.", notifications: [], unreadCount: 0 },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "notifications",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const payload = await parseJsonObjectBody(request, {
      maxBytes: 2 * 1024,
      allowedKeys: ["notificationId", "all"],
    });
    const notificationId = readOptionalString(payload, "notificationId", {
      fieldName: "Notificação",
      maxLength: 60,
      pattern: /^[0-9a-f-]{36}$/i,
    });
    const all = readOptionalBoolean(payload, "all", false);

    await markUserNotificationsRead({ userId, notificationId, all });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao atualizar notificações." }, { status: 500 });
  }
}
