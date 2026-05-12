import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

interface MarkAllReadData {
  success: boolean;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiResponse<MarkAllReadData>>(
      { data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { error } = await adminClient
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<MarkAllReadData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<MarkAllReadData>>({
    data: { success: true },
    error: null,
  });
}
